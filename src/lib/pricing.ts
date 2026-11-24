import type { Level } from '../types';

export type CustomerType = 'MEMBER' | 'NON_MEMBER';
export type PackageKey = 'REGULER' | 'PAGI' | 'SIANG' | 'BEGADANG';

export const NON_MEMBER_RATES: Record<Level, number> = {
  L1: 7000,
  L2: 9000,
  L3: 12000,
  L3MAX: 15000,
};

// Member prices from the price list, keyed by booked hours.
export const MEMBER_RATES: Record<number, Record<Level, number>> = {
  1: { L1: 6000, L2: 8000, L3: 11000, L3MAX: 14000 },
  2: { L1: 12000, L2: 16000, L3: 22000, L3MAX: 28000 },
  3: { L1: 18000, L2: 24000, L3: 30000, L3MAX: 42000 },
  4: { L1: 24000, L2: 32000, L3: 40000, L3MAX: 56000 },
  5: { L1: 30000, L2: 40000, L3: 50000, L3MAX: 65000 },
  6: { L1: 36000, L2: 48000, L3: 60000, L3MAX: 78000 },
  7: { L1: 42000, L2: 56000, L3: 70000, L3MAX: 91000 },
  8: { L1: 48000, L2: 64000, L3: 80000, L3MAX: 96000 },
  10: { L1: 54000, L2: 70000, L3: 90000, L3MAX: 100000 },
};

export const PACKAGES: Record<Exclude<PackageKey, 'REGULER'>, {
  label: string;
  window: string;
  startMinute: number;
  hours: number;
  prices: Record<Level, number>;
}> = {
  PAGI: {
    label: 'Paket Pagi',
    window: '08.00–13.00',
    startMinute: 8 * 60,
    hours: 5,
    prices: { L1: 25000, L2: 30000, L3: 35000, L3MAX: 40000 },
  },
  SIANG: {
    label: 'Paket Siang',
    window: '11.00–16.00',
    startMinute: 11 * 60,
    hours: 5,
    prices: { L1: 30000, L2: 35000, L3: 40000, L3MAX: 50000 },
  },
  BEGADANG: {
    label: 'Paket Begadang',
    window: '21.00–06.00',
    startMinute: 21 * 60,
    hours: 9,
    prices: { L1: 40000, L2: 50000, L3: 60000, L3MAX: 75000 },
  },
};

export function packageWindow(packageKey: PackageKey) {
  if (packageKey === 'REGULER') return null;
  const item = PACKAGES[packageKey];
  return { startMinute: item.startMinute, hours: item.hours, window: item.window };
}

export function unitPrice(level: Level, hours: number, customerType: CustomerType, packageKey: PackageKey) {
  if (packageKey !== 'REGULER') return PACKAGES[packageKey].prices[level];
  if (customerType === 'MEMBER') {
    const listed = Object.keys(MEMBER_RATES).map(Number)
      .filter((value) => value <= hours)
      .sort((a, b) => b - a)[0] ?? 1;
    const extra = hours - listed;
    return MEMBER_RATES[listed][level] + extra * MEMBER_RATES[1][level];
  }
  return NON_MEMBER_RATES[level] * hours;
}

export function bookingPrice(
  level: Level,
  hours: number,
  quantity: number,
  customerType: CustomerType,
  packageKey: PackageKey,
) {
  return unitPrice(level, hours, customerType, packageKey) * Math.max(1, quantity);
}
