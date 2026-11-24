import type { Availability, Booking, Pc, Settings } from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Permintaan gagal') as Error & { data?: Availability };
    error.data = data.result;
    throw error;
  }
  return data as T;
}

export const api = {
  pcs: () => request<Pc[]>('/api/pcs'),
  settings: () => request<Settings>('/api/settings'),
  bookings: (date: string) => request<Booking[]>(`/api/bookings?date=${encodeURIComponent(date)}`),
  bookingsRange: (from: string, to: string) => request<Booking[]>(
    `/api/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  ),
  check: (payload: unknown) => request<Availability>('/api/bookings/check', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (id: string, payload: Record<string, unknown>) => request<Booking>(`/api/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'edit', ...payload }),
  }),
  create: (payload: unknown) => request<Booking>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  setStatus: (id: string, status: string) => request<Booking>(`/api/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'status', status }),
  }),
  extend: (id: string, hours: number) => request<Booking>(`/api/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'extend', hours }),
  }),
  move: (id: string, date: string, startMinute: number, pcId: string) => request<Booking>(`/api/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'move', date, start_minute: startMinute, pc_id: pcId }),
  }),
  cancel: (id: string) => request<Booking>(`/api/bookings/${id}`, { method: 'DELETE' }),
  saveSettings: (values: Partial<Settings>) => request<Settings>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(values),
  }),
};
