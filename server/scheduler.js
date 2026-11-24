// Pure scheduling logic. No Express, no database. Safe to unit test.

export const LEVELS = ['L1', 'L2', 'L3', 'L3MAX'];
export const ROOMS = ['NON_SMOKE', 'SMOKE'];
export const STATUSES = ['BOOKED', 'CHECKED_IN', 'DONE', 'CANCELLED', 'NO_SHOW'];
export const MAX_HOURS = 12;

const PC_GROUPS = [
  ['L1', 'NON_SMOKE', 2],
  ['L2', 'NON_SMOKE', 4],
  ['L2', 'SMOKE', 6],
  ['L3', 'NON_SMOKE', 2],
  ['L3MAX', 'NON_SMOKE', 1],
];

export const PCS = PC_GROUPS.flatMap(([level, room, count], groupIndex) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${level}-${room === 'SMOKE' ? 'SM' : 'NS'}-${i + 1}`,
    level,
    room,
    sortOrder: groupIndex * 100 + i,
  })),
);

export const pad = (n) => String(n).padStart(2, '0');

export function dateKeyFrom(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isValidDateKey(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return false;
  const d = parseDateKey(key);
  return !Number.isNaN(d.getTime()) && dateKeyFromUtc(d) === key;
}

function dateKeyFromUtc(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(key, n) {
  const d = parseDateKey(key);
  d.setUTCDate(d.getUTCDate() + n);
  return dateKeyFromUtc(d);
}

export function dayIndex(key) {
  return Math.floor(parseDateKey(key).getTime() / 86400000);
}

export function toAbs(dateKey, minute) {
  return dayIndex(dateKey) * 1440 + minute;
}

export function fromAbs(abs) {
  const day = Math.floor(abs / 1440);
  const d = new Date(day * 86400000);
  return { dateKey: dateKeyFromUtc(d), minute: ((abs % 1440) + 1440) % 1440 };
}

export function fmtClock(minute) {
  const m = ((minute % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function bookingInterval(b) {
  const start = toAbs(b.date, b.start_minute);
  return { start, end: start + b.hours * 60 };
}

export function isActive(b) {
  return b.status !== 'CANCELLED' && b.status !== 'NO_SHOW';
}

export function bookingPcIds(b) {
  if (Array.isArray(b.pc_ids) && b.pc_ids.length) return b.pc_ids;
  if (typeof b.pc_ids === 'string') {
    try {
      const parsed = JSON.parse(b.pc_ids);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch { /* fall through to single pc_id */ }
  }
  return b.pc_id ? [b.pc_id] : [];
}

export function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

function summarize(b) {
  return {
    id: b.id,
    customerName: b.customer_name,
    date: b.date,
    startMinute: b.start_minute,
    hours: b.hours,
    pcId: b.pc_id,
    pcIds: bookingPcIds(b),
    quantity: b.quantity || 1,
    status: b.status,
  };
}

export function validatePayload(p) {
  const errors = [];
  if (!p || typeof p !== 'object') return ['Data tidak valid'];
  if (!(p.name || '').trim()) errors.push('Nama wajib diisi');
  if (!(p.phone || '').trim()) errors.push('Nomor HP wajib diisi');
  if (!isValidDateKey(p.date)) errors.push('Tanggal tidak valid');
  if (!Number.isInteger(p.start_minute) || p.start_minute < 0 || p.start_minute > 1439)
    errors.push('Jam mulai tidak valid');
  if (!Number.isInteger(p.hours) || p.hours < 1 || p.hours > MAX_HOURS)
    errors.push(`Durasi harus 1-${MAX_HOURS} jam`);
  if (!LEVELS.includes(p.level)) errors.push('Tipe PC tidak valid');
  if (!ROOMS.includes(p.room)) errors.push('Ruangan tidak valid');
  const quantity = p.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 15)
    errors.push('Jumlah PC harus 1-15');
  if (p.pcIds !== undefined) {
    if (!Array.isArray(p.pcIds) || p.pcIds.length !== quantity)
      errors.push(`Pilih ${quantity} PC sesuai jumlah PC`);
  }
  return errors;
}

export function maxHoursForPc(pcId, startAbs, active) {
  const list = active
    .filter((b) => isActive(b) && bookingPcIds(b).includes(pcId))
    .map(bookingInterval)
    .sort((a, b) => a.start - b.start);

  for (const iv of list) {
    if (iv.start < startAbs && startAbs < iv.end) return 0;
  }
  const next = list.find((iv) => iv.start >= startAbs);
  if (!next) return MAX_HOURS;
  return Math.max(0, Math.min(MAX_HOURS, Math.floor((next.start - startAbs) / 60)));
}

export function bookedMinutesOnDate(pcId, dateKey, active) {
  const start = toAbs(dateKey, 0);
  const end = start + 1440;
  return active
    .filter((b) => bookingPcIds(b).includes(pcId))
    .reduce((sum, b) => {
      const iv = bookingInterval(b);
      return sum + Math.max(0, Math.min(iv.end, end) - Math.max(iv.start, start));
    }, 0);
}

function findNextFreeStart(payload, active, pcs) {
  const hoursMs = payload.hours * 60;
  const quantity = payload.quantity ?? 1;
  for (let m = payload.start_minute + 1; m < 1440; m += 1) {
    const interval = { start: toAbs(payload.date, m), end: toAbs(payload.date, m) + hoursMs };
    const free = pcs.filter(
      (pc) => !active.some((b) => bookingPcIds(b).includes(pc.id) && overlaps(bookingInterval(b), interval)),
    ).length;
    if (free >= quantity) return m;
  }
  return null;
}

export function evaluate(payload, allBookings, options = {}) {
  const { excludeId, onlyPcIds, force = false } = options;
  const errors = validatePayload(payload);
  if (errors.length) {
    return { ok: false, errors, conflicts: [], alternatives: [], nextStart: null, maxHours: 0, pcId: null, pcIds: [] };
  }

  const quantity = payload.quantity ?? 1;
  const startAbs = toAbs(payload.date, payload.start_minute);
  const candidate = { start: startAbs, end: startAbs + payload.hours * 60 };
  const active = allBookings.filter((b) => isActive(b) && b.id !== excludeId);

  let candidates = PCS.filter((p) => p.level === payload.level && p.room === payload.room);
  if (payload.pcIds?.length) {
    const chosen = payload.pcIds;
    if (chosen.some((id) => !candidates.some((pc) => pc.id === id))) {
      return { ok: false, errors: ['PC yang dipilih tidak sesuai tipe/ruangan'], conflicts: [], alternatives: [], nextStart: null, maxHours: 0, pcId: null, pcIds: [] };
    }
    candidates = candidates.filter((pc) => chosen.includes(pc.id));
  }
  if (onlyPcIds?.length) candidates = candidates.filter((p) => onlyPcIds.includes(p.id));

  const free = [];
  const blocked = [];
  for (const pc of candidates) {
    const conflicts = active.filter(
      (b) => bookingPcIds(b).includes(pc.id) && overlaps(bookingInterval(b), candidate),
    );
    if (conflicts.length === 0) free.push(pc);
    else blocked.push({ pcId: pc.id, conflicts: conflicts.map(summarize) });
  }

  const sortByLoad = (a, b) => {
    const diff = bookedMinutesOnDate(a.id, payload.date, active) - bookedMinutesOnDate(b.id, payload.date, active);
    return diff || a.id.localeCompare(b.id);
  };

  const maxHours = candidates.length
    ? Math.max(...candidates.map((pc) => maxHoursForPc(pc.id, startAbs, active)))
    : 0;

  if (force) {
    const pcIds = [...candidates].sort(sortByLoad).slice(0, quantity).map((p) => p.id);
    return {
      ok: true,
      forced: true,
      pcId: pcIds[0] || null,
      pcIds,
      errors: [],
      conflicts: blocked.flatMap((b) => b.conflicts),
      alternatives: [],
      nextStart: null,
      maxHours,
    };
  }

  if (free.length >= quantity) {
    const pcIds = [...free].sort(sortByLoad).slice(0, quantity).map((p) => p.id);
    return {
      ok: true,
      forced: false,
      pcId: pcIds[0],
      pcIds,
      errors: [],
      conflicts: [],
      alternatives: [],
      nextStart: null,
      maxHours,
    };
  }

  const conflicts = [...new Map(blocked.flatMap((b) => b.conflicts).map((c) => [c.id, c])).values()];
  const alternatives = [];
  for (const level of LEVELS) {
    for (const room of ROOMS) {
      if (level === payload.level && room === payload.room) continue;
      const pcs = PCS.filter((p) => p.level === level && p.room === room);
      const freeCount = pcs.filter(
        (pc) => !active.some((b) => bookingPcIds(b).includes(pc.id) && overlaps(bookingInterval(b), candidate)),
      ).length;
      if (freeCount >= quantity) alternatives.push({ level, room, count: freeCount });
    }
  }

  return {
    ok: false,
    forced: false,
    pcId: null,
    pcIds: [],
    errors: [],
    conflicts,
    alternatives,
    nextStart: findNextFreeStart(payload, active, candidates),
    maxHours,
  };
}
