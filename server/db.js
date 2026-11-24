import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { PCS, dateKeyFrom } from './scheduler.js';

const dataDir = path.resolve('data');
const backupDir = path.join(dataDir, 'backups');
fs.mkdirSync(backupDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'warnet.db'));

const MAX_BACKUPS = 30;

function pruneBackups() {
  const files = fs.readdirSync(backupDir)
    .filter((name) => name.endsWith('.db'))
    .map((name) => ({ name, time: fs.statSync(path.join(backupDir, name)).mtimeMs }))
    .sort((a, b) => b.time - a.time);
  for (const { name } of files.slice(MAX_BACKUPS)) {
    fs.unlinkSync(path.join(backupDir, name));
  }
}

export function backupNow(reason = 'manual') {
  const now = new Date();
  const stamp = `${now.toISOString().slice(0, 10)}-${now.toTimeString().slice(0, 8).replaceAll(':', '')}`;
  const target = path.join(backupDir, `warnet-${stamp}-${reason}.db`);
  db.exec(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
  pruneBackups();
  return target;
}

function backupDailyIfNeeded() {
  const target = path.join(backupDir, `warnet-${dateKeyFrom(new Date())}.db`);
  if (fs.existsSync(target)) return;
  db.exec(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
  pruneBackups();
}

backupDailyIfNeeded();

db.exec(`
  CREATE TABLE IF NOT EXISTS pcs (
    id TEXT PRIMARY KEY,
    level TEXT NOT NULL,
    room TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    date TEXT NOT NULL,
    start_minute INTEGER NOT NULL,
    hours INTEGER NOT NULL,
    level TEXT NOT NULL,
    room TEXT NOT NULL,
    pc_id TEXT NOT NULL,
    pc_ids TEXT NOT NULL DEFAULT '[]',
    quantity INTEGER NOT NULL DEFAULT 1,
    customer_type TEXT NOT NULL DEFAULT 'NON_MEMBER',
    package TEXT NOT NULL DEFAULT 'REGULER',
    status TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    force_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Additive schema changes only. Backup first so a code update never loses data.
const bookingColumns = db.prepare('PRAGMA table_info(bookings)').all().map((column) => column.name);
for (const [column, definition] of [
  ['pc_ids', "TEXT NOT NULL DEFAULT '[]'"],
  ['quantity', 'INTEGER NOT NULL DEFAULT 1'],
  ['customer_type', "TEXT NOT NULL DEFAULT 'NON_MEMBER'"],
  ['package', "TEXT NOT NULL DEFAULT 'REGULER'"],
]) {
  if (bookingColumns.includes(column)) continue;
  backupNow(`migrate-${column}`);
  db.exec(`ALTER TABLE bookings ADD COLUMN ${column} ${definition}`);
}

const seedPc = db.prepare('INSERT OR IGNORE INTO pcs (id, level, room, sort_order) VALUES (?, ?, ?, ?)');
for (const pc of PCS) seedPc.run(pc.id, pc.level, pc.room, pc.sortOrder);

const WA_TEMPLATE =
  'Halo Kak {name}, booking warnet kamu sudah tercatat.\n' +
  '{date} pukul {start} - {end}\n' +
  '{level} {room} · {hours} jam\n' +
  'Total Rp {total}\n' +
  'No. HP: {phone}\n' +
  'Mohon datang maksimal 15 menit setelah jadwal. Terima kasih!';

const defaults = {
  rate_L1: '7000',
  rate_L2: '9000',
  rate_L3: '12000',
  rate_L3MAX: '15000',
  late_minutes: '15',
  max_hours: '12',
  wa_template: WA_TEMPLATE,
  pc_used: '[]',
  occupancy_sync: 'true',
};
const seedSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaults)) seedSetting.run(key, value);

// Bring untouched default rates up to the current non-member price list.
const rateUpgrade = [
  ['rate_L1', '5000', '7000'],
  ['rate_L2', '7000', '9000'],
  ['rate_L3', '10000', '12000'],
];
for (const [key, oldValue, newValue] of rateUpgrade) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (row?.value === oldValue) {
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(newValue, key);
  }
}

export function getPcs() {
  return db.prepare('SELECT id, level, room FROM pcs ORDER BY sort_order').all();
}

export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const raw = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    rate_L1: Number(raw.rate_L1),
    rate_L2: Number(raw.rate_L2),
    rate_L3: Number(raw.rate_L3),
    rate_L3MAX: Number(raw.rate_L3MAX),
    late_minutes: Number(raw.late_minutes),
    max_hours: Number(raw.max_hours),
    wa_template: raw.wa_template,
    pc_used: (() => {
      try {
        const parsed = JSON.parse(raw.pc_used || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })(),
    occupancy_sync: raw.occupancy_sync !== 'false',
  };
}

export function setSettings(values) {
  const update = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
  for (const [key, value] of Object.entries(values)) {
    if (!(key in defaults)) continue;
    const stored = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
    update.run(stored, key);
  }
  return getSettings();
}

function hydrate(row) {
  if (!row) return null;
  let pcIds;
  try { pcIds = JSON.parse(row.pc_ids || '[]'); } catch { pcIds = []; }
  if (!Array.isArray(pcIds) || !pcIds.length) pcIds = [row.pc_id];
  return { ...row, pc_ids: pcIds, quantity: row.quantity || 1 };
}

export function getBookings() {
  return db.prepare('SELECT * FROM bookings ORDER BY date, start_minute').all().map(hydrate);
}

export function getBooking(id) {
  return hydrate(db.prepare('SELECT * FROM bookings WHERE id = ?').get(id));
}

export function insertBooking(b) {
  db.prepare(`
    INSERT INTO bookings
      (id, customer_name, phone, date, start_minute, hours, level, room, pc_id, pc_ids, quantity,
       customer_type, package, status, notes, force_reason, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.id, b.customer_name, b.phone, b.date, b.start_minute, b.hours,
    b.level, b.room, b.pc_id, JSON.stringify(b.pc_ids), b.quantity,
    b.customer_type, b.package, b.status, b.notes, b.force_reason, b.created_at, b.updated_at,
  );
  return getBooking(b.id);
}

export function updateBooking(id, patch) {
  const current = getBooking(id);
  if (!current) return null;
  const next = { ...current, ...patch, updated_at: new Date().toISOString() };
  db.prepare(`
    UPDATE bookings SET
      customer_name = ?, phone = ?, date = ?, start_minute = ?, hours = ?, level = ?,
      room = ?, pc_id = ?, pc_ids = ?, quantity = ?, customer_type = ?, package = ?,
      status = ?, notes = ?, force_reason = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.customer_name, next.phone, next.date, next.start_minute, next.hours,
    next.level, next.room, next.pc_id, JSON.stringify(next.pc_ids), next.quantity,
    next.customer_type, next.package, next.status, next.notes, next.force_reason,
    next.updated_at, id,
  );
  return getBooking(id);
}
