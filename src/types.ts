export type Level = 'L1' | 'L2' | 'L3' | 'L3MAX';
export type Room = 'NON_SMOKE' | 'SMOKE';
export type Status = 'BOOKED' | 'CHECKED_IN' | 'DONE' | 'CANCELLED' | 'NO_SHOW';

export interface Pc {
  id: string;
  level: Level;
  room: Room;
}

export interface Booking {
  id: string;
  customer_name: string;
  phone: string;
  date: string;
  start_minute: number;
  hours: number;
  level: Level;
  room: Room;
  pc_id: string;
  pc_ids: string[];
  quantity: number;
  customer_type: 'MEMBER' | 'NON_MEMBER';
  package: 'REGULER' | 'PAGI' | 'SIANG' | 'BEGADANG';
  status: Status;
  notes: string;
  force_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  rate_L1: number;
  rate_L2: number;
  rate_L3: number;
  rate_L3MAX: number;
  late_minutes: number;
  max_hours: number;
  wa_template: string;
  pc_used: string[];
  occupancy_sync: boolean;
}

export interface Conflict {
  id: string;
  customerName: string;
  date: string;
  startMinute: number;
  hours: number;
  pcId: string;
  status: Status;
}

export interface Alternative {
  level: Level;
  room: Room;
  count: number;
}

export interface Availability {
  ok: boolean;
  forced: boolean;
  pcId: string | null;
  pcIds: string[];
  errors: string[];
  conflicts: Conflict[];
  alternatives: Alternative[];
  nextStart: number | null;
  maxHours: number;
}

export interface ToastItem {
  id: string;
  message: string;
  tone: 'success' | 'error';
  undoId?: string;
}
