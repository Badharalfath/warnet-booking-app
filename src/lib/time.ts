import type { Booking, Pc, Settings } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKeyFrom(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey(): string {
  return dateKeyFrom(new Date());
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

function dayIndex(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

export function toAbs(dateKey: string, minute: number): number {
  return dayIndex(dateKey) * 1440 + minute;
}

export function bookingInterval(b: Booking): { start: number; end: number } {
  const start = toAbs(b.date, b.start_minute);
  return { start, end: start + b.hours * 60 };
}

export function fmtClock(minute: number): string {
  const m = ((minute % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function nextQuarter(): number {
  const now = new Date();
  return Math.ceil((now.getHours() * 60 + now.getMinutes() + 1) / 5) * 5;
}

export function nowAbs(): number {
  const now = new Date();
  return toAbs(todayKey(), now.getHours() * 60 + now.getMinutes());
}

export function fmtDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function fmtRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

export function rateFor(level: Booking['level'], settings: Settings): number {
  return settings[`rate_${level}`];
}

export function totalFor(hours: number, level: Booking['level'], settings: Settings): number {
  return hours * rateFor(level, settings);
}

export function isLate(b: Booking, settings: Settings): boolean {
  if (b.status !== 'BOOKED') return false;
  return nowAbs() > toAbs(b.date, b.start_minute) + settings.late_minutes;
}

export function segmentsForDate(b: Booking, dateKey: string) {
  const iv = bookingInterval(b);
  const dayStart = toAbs(dateKey, 0);
  const dayEnd = dayStart + 1440;
  const start = Math.max(iv.start, dayStart);
  const end = Math.min(iv.end, dayEnd);
  if (start >= end) return null;
  return { start: start - dayStart, end: end - dayStart };
}

export function isActive(b: Booking): boolean {
  return b.status !== 'CANCELLED' && b.status !== 'NO_SHOW';
}

export function freePcIds(
  pcs: Pc[],
  bookings: Booking[],
  level: Booking['level'],
  room: Booking['room'],
  date: string,
  startMinute: number,
  hours: number,
): string[] {
  const start = toAbs(date, startMinute);
  const end = start + hours * 60;
  const active = bookings.filter(isActive);
  return pcs
    .filter((pc) => pc.level === level && pc.room === room)
    .filter((pc) => !active.some((b) => {
      const ids = b.pc_ids?.length ? b.pc_ids : [b.pc_id];
      if (!ids.includes(pc.id)) return false;
      const iv = bookingInterval(b);
      return iv.start < end && iv.end > start;
    }))
    .map((pc) => pc.id);
}
