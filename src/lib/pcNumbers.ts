// Display numbering from the warnet floor plan. Slot 7 is the crossed
// "No PC yet" placeholder, so it is intentionally absent here.
export const PC_NUMBERS: Record<string, number> = {
  'L1-NS-2': 1,
  'L1-NS-1': 2,
  'L2-NS-4': 3,
  'L2-NS-3': 4,
  'L2-NS-2': 5,
  'L2-NS-1': 6,
  'L3-NS-1': 8,
  'L3-NS-2': 9,
  'L3MAX-NS-1': 10,
  'L2-SM-6': 11,
  'L2-SM-5': 12,
  'L2-SM-4': 13,
  'L2-SM-3': 14,
  'L2-SM-2': 15,
  'L2-SM-1': 16,
};

export function pcNumber(id: string | null | undefined): string {
  if (!id) return '—';
  const number = PC_NUMBERS[id];
  return number ? `#${number}` : '?';
}

export function pcSortValue(id: string): number {
  return PC_NUMBERS[id] ?? 999;
}

export function sortPcIds(ids: string[]): string[] {
  return [...ids].sort((a, b) => pcSortValue(a) - pcSortValue(b));
}

export function pcNumbers(ids: string[]): string {
  return sortPcIds(ids).map(pcNumber).join(', ');
}
