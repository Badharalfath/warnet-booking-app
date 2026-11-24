import express from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PCS,
  STATUSES,
  bookingInterval,
  evaluate,
  isValidDateKey,
  toAbs,
} from './scheduler.js';
import {
  getPcs,
  getBookings,
  getBooking,
  getSettings,
  setSettings,
  insertBooking,
  updateBooking,
} from './db.js';

const app = express();
app.use(express.json());

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '..');

app.get('/api/pcs', (_req, res) => res.json(getPcs()));

app.get('/api/settings', (_req, res) => res.json(getSettings()));

app.put('/api/settings', (req, res) => {
  const allowed = ['rate_L1', 'rate_L2', 'rate_L3', 'rate_L3MAX', 'late_minutes', 'max_hours', 'wa_template', 'pc_used', 'occupancy_sync'];
  const patch = {};
  for (const key of allowed) if (key in req.body) patch[key] = req.body[key];
  res.json(setSettings(patch));
});

app.get('/api/bookings', (req, res) => {
  const all = getBookings();
  const { date, from, to } = req.query;
  let start;
  let end;
  if (from && to) {
    start = toAbs(from, 0);
    end = toAbs(to, 0);
  } else if (date) {
    start = toAbs(date, 0);
    end = start + 1440;
  } else {
    return res.json(all);
  }
  return res.json(
    all.filter((b) => {
      const iv = bookingInterval(b);
      return iv.start < end && iv.end > start;
    }),
  );
});

app.post('/api/bookings/check', (req, res) => {
  const { excludeId, onlyPcId, onlyPcIds, ...payload } = req.body || {};
  const pcIds = onlyPcIds || (onlyPcId ? [onlyPcId] : undefined);
  res.json(evaluate(payload, getBookings(), { excludeId, onlyPcIds: pcIds }));
});

app.post('/api/bookings', (req, res) => {
  const p = req.body || {};
  const result = evaluate(p, getBookings());

  if (!result.ok && !p.force) {
    return res.status(409).json({ message: 'Slot bentrok dengan booking lain', result });
  }
  if (p.force && !(p.forceReason || '').trim()) {
    return res.status(400).json({ message: 'Alasan override wajib diisi' });
  }

  const pcIds = result.pcIds.length ? result.pcIds : [result.pcId].filter(Boolean);
  const now = new Date().toISOString();
  const booking = {
    id: randomUUID(),
    customer_name: String(p.name).trim(),
    phone: String(p.phone).trim(),
    date: p.date,
    start_minute: p.start_minute,
    hours: p.hours,
    level: p.level,
    room: p.room,
    pc_id: pcIds[0],
    pc_ids: pcIds,
    quantity: pcIds.length,
    customer_type: ['MEMBER', 'NON_MEMBER'].includes(p.customer_type) ? p.customer_type : 'NON_MEMBER',
    package: ['REGULER', 'PAGI', 'SIANG', 'BEGADANG'].includes(p.package) ? p.package : 'REGULER',
    status: 'BOOKED',
    notes: String(p.notes || '').trim(),
    force_reason: p.force ? String(p.forceReason).trim() : null,
    created_at: now,
    updated_at: now,
  };
  insertBooking(booking);
  return res.status(201).json(booking);
});

app.patch('/api/bookings/:id', (req, res) => {
  const booking = getBooking(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking tidak ditemukan' });

  const { action } = req.body || {};

  if (action === 'status') {
    if (!STATUSES.includes(req.body.status)) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }
    return res.json(updateBooking(booking.id, { status: req.body.status }));
  }

  if (action === 'extend') {
    const hours = req.body.hours;
    if (!Number.isInteger(hours) || hours <= booking.hours || hours > 12) {
      return res.status(400).json({ message: 'Durasi baru tidak valid' });
    }
    if (!['BOOKED', 'CHECKED_IN'].includes(booking.status)) {
      return res.status(400).json({ message: 'Booking ini sudah selesai' });
    }
    const result = evaluate(
      {
        name: booking.customer_name,
        phone: booking.phone,
        date: booking.date,
        start_minute: booking.start_minute,
        hours,
        level: booking.level,
        room: booking.room,
        quantity: booking.quantity,
      },
      getBookings(),
      { excludeId: booking.id, onlyPcIds: booking.pc_ids },
    );
    if (!result.ok) {
      return res.status(409).json({ message: 'Perpanjangan bentrok dengan booking berikutnya', result });
    }
    return res.json(updateBooking(booking.id, { hours }));
  }

  if (action === 'edit') {
    const p = req.body || {};
    const payload = {
      name: String(p.name || '').trim(),
      phone: String(p.phone || '').trim(),
      date: p.date,
      start_minute: p.start_minute,
      hours: p.hours,
      level: p.level,
      room: p.room,
      quantity: Number.isInteger(p.quantity) ? p.quantity : booking.quantity,
      customer_type: ['MEMBER', 'NON_MEMBER'].includes(p.customer_type) ? p.customer_type : booking.customer_type,
      package: ['REGULER', 'PAGI', 'SIANG', 'BEGADANG'].includes(p.package) ? p.package : booking.package,
    };
    const keepPcs = payload.level === booking.level && payload.room === booking.room
      && payload.quantity <= booking.pc_ids.length;
    const result = evaluate(payload, getBookings(), {
      excludeId: booking.id,
      onlyPcIds: keepPcs ? booking.pc_ids : undefined,
    });

    if (!result.ok && !p.force) {
      return res.status(409).json({ message: 'Perubahan bentrok dengan booking lain', result });
    }
    if (p.force && !(p.forceReason || '').trim()) {
      return res.status(400).json({ message: 'Alasan override wajib diisi' });
    }

    const updated = updateBooking(booking.id, {
      customer_name: payload.name,
      phone: payload.phone,
      date: payload.date,
      start_minute: payload.start_minute,
      hours: payload.hours,
      level: payload.level,
      room: payload.room,
      notes: String(p.notes || '').trim(),
      pc_id: result.pcId || booking.pc_id,
      pc_ids: result.pcIds.length ? result.pcIds : booking.pc_ids,
      quantity: payload.quantity,
      customer_type: payload.customer_type,
      package: payload.package,
      force_reason: p.force ? String(p.forceReason).trim() : null,
    });
    return res.json(updated);
  }

  if (action === 'move') {
    const { date: newDate, start_minute: newStart, pc_id: newPcId } = req.body || {};
    if (!isValidDateKey(newDate) || !Number.isInteger(newStart) || newStart < 0 || newStart > 1439) {
      return res.status(400).json({ message: 'Jadwal baru tidak valid' });
    }
    if (!PCS.some((pc) => pc.id === newPcId && pc.level === booking.level && pc.room === booking.room)) {
      return res.status(400).json({ message: 'PC tidak sesuai tipe booking' });
    }
    if (!['BOOKED', 'CHECKED_IN'].includes(booking.status)) {
      return res.status(400).json({ message: 'Booking ini sudah selesai' });
    }
    const result = evaluate(
      {
        name: booking.customer_name,
        phone: booking.phone,
        date: newDate,
        start_minute: newStart,
        hours: booking.hours,
        level: booking.level,
        room: booking.room,
        quantity: booking.quantity,
      },
      getBookings(),
      { excludeId: booking.id, onlyPcIds: booking.pc_ids },
    );
    if (!result.ok) {
      return res.status(409).json({ message: 'Posisi baru bentrok dengan booking lain', result });
    }
    return res.json(updateBooking(booking.id, { date: newDate, start_minute: newStart }));
  }

  return res.status(400).json({ message: 'Aksi tidak dikenal' });
});

app.delete('/api/bookings/:id', (req, res) => {
  const booking = getBooking(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking tidak ditemukan' });
  return res.json(updateBooking(booking.id, { status: 'CANCELLED' }));
});

app.use(express.static(path.join(projectRoot, 'dist')));
app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ message: 'Not found' });
  return res.sendFile(path.join(projectRoot, 'dist', 'index.html'));
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, '0.0.0.0', () => {
  console.log(`Warnet API listening on http://localhost:${port}`);
});
