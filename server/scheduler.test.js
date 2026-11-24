import { describe, expect, it } from 'vitest';
import { evaluate, maxHoursForPc, toAbs } from './scheduler.js';

const base = {
  name: 'Andi',
  phone: '08123456789',
  date: '2026-11-21',
  start_minute: 13 * 60,
  hours: 2,
  level: 'L1',
  room: 'NON_SMOKE',
};

function booking(overrides = {}) {
  return {
    id: 'b1',
    customer_name: 'Existing',
    phone: '08111111111',
    date: '2026-11-21',
    start_minute: 14 * 60,
    hours: 2,
    level: 'L1',
    room: 'NON_SMOKE',
    pc_id: 'L1-NS-1',
    status: 'BOOKED',
    ...overrides,
  };
}

describe('evaluate', () => {
  it('blocks overlap when every matching PC is taken and suggests another slot', () => {
    const blockers = [
      booking({ id: 'a', pc_id: 'L1-NS-1' }),
      booking({ id: 'b', pc_id: 'L1-NS-2' }),
    ];
    const result = evaluate({ ...base, start_minute: 15 * 60, hours: 2 }, blockers);
    expect(result.ok).toBe(false);
    expect(result.conflicts).toHaveLength(2);
    expect(result.nextStart).toBe(16 * 60);
  });

  it('allows adjacent bookings: end 14:00, next start 14:00', () => {
    const result = evaluate({ ...base, start_minute: 12 * 60, hours: 2 }, [booking()]);
    expect(result.ok).toBe(true);
    expect(['L1-NS-1', 'L1-NS-2']).toContain(result.pcId);
  });

  it('detects a cross-midnight conflict on the next day', () => {
    const late = booking({
      id: 'late',
      date: '2026-11-21',
      start_minute: 22 * 60,
      hours: 4,
      level: 'L3MAX',
      pc_id: 'L3MAX-NS-1',
    });
    const result = evaluate(
      { ...base, date: '2026-11-22', start_minute: 60, hours: 2, level: 'L3MAX' },
      [late],
    );
    expect(result.ok).toBe(false);
    expect(result.conflicts[0].id).toBe('late');
  });

  it('keeps minute precision and bills integer hours', () => {
    const result = evaluate({ ...base, start_minute: 6 * 60 + 15, hours: 2 }, []);
    expect(result.ok).toBe(true);
  });

  it('caps hours from the next booking on the same PC', () => {
    const next = booking({ id: 'next', start_minute: 15 * 60, hours: 1 });
    const start = toAbs('2026-11-21', 13 * 60);
    expect(maxHoursForPc('L1-NS-1', start, [next])).toBe(2);
  });

  it('lifts the cap when the next booking is cancelled', () => {
    const cancelled = booking({ id: 'next', start_minute: 15 * 60, hours: 1, status: 'CANCELLED' });
    const start = toAbs('2026-11-21', 13 * 60);
    expect(maxHoursForPc('L1-NS-1', start, [cancelled])).toBe(12);
  });

  it('allows extend after the next booking is cancelled', () => {
    const cancelled = booking({ id: 'next', start_minute: 15 * 60, hours: 1, status: 'NO_SHOW' });
    const result = evaluate({ ...base, hours: 4 }, [cancelled], {
      excludeId: 'self',
      onlyPcIds: ['L1-NS-1'],
    });
    expect(result.ok).toBe(true);
  });

  it('reports alternatives when the requested type is full', () => {
    const blockers = [
      booking({ id: 'a', pc_id: 'L1-NS-1', start_minute: 13 * 60, hours: 2 }),
      booking({ id: 'b', pc_id: 'L1-NS-2', start_minute: 13 * 60, hours: 2 }),
    ];
    const result = evaluate(base, blockers);
    expect(result.ok).toBe(false);
    expect(result.alternatives.some((a) => a.level === 'L2' && a.room === 'NON_SMOKE')).toBe(true);
  });

  it('requires phone number', () => {
    const result = evaluate({ ...base, phone: '' }, []);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Nomor HP wajib diisi');
  });

  it('force override succeeds and records the conflict', () => {
    const result = evaluate({ ...base, start_minute: 15 * 60 }, [booking()], { force: true });
    expect(result.ok).toBe(true);
    expect(result.forced).toBe(true);
    expect(result.conflicts).toHaveLength(1);
  });

  it('assigns distinct PCs for quantity > 1', () => {
    const result = evaluate({ ...base, quantity: 2 }, []);
    expect(result.ok).toBe(true);
    expect(result.pcIds).toEqual(['L1-NS-1', 'L1-NS-2']);
  });

  it('blocks quantity when not enough matching PCs are free', () => {
    const result = evaluate({ ...base, quantity: 3 }, [booking({ id: 'x', pc_id: 'L1-NS-1' })]);
    expect(result.ok).toBe(false);
  });

  it('respects pc_ids already occupied by a multi-PC booking', () => {
    const multi = booking({ id: 'm', pc_ids: ['L1-NS-1', 'L1-NS-2'], quantity: 2, start_minute: 13 * 60, hours: 2 });
    const result = evaluate(base, [multi]);
    expect(result.ok).toBe(false);
  });
});
