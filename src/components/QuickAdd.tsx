import { useEffect, useMemo, useRef, useState } from 'react';
import { CaretLeft, DotsSix, Warning, X } from '@phosphor-icons/react';
import type { Availability, Booking, Level, Pc, Room, Settings } from '../types';
import { api } from '../api';
import DatePicker from './DatePicker';
import { addDays, fmtClock, fmtRupiah, freePcIds, nextQuarter, parseClock, todayKey } from '../lib/time';
import { pcNumber, pcNumbers, pcSortValue } from '../lib/pcNumbers';
import {
  PACKAGES,
  bookingPrice,
  packageWindow,
  type CustomerType,
  type PackageKey,
} from '../lib/pricing';

interface Props {
  open: boolean;
  instant: boolean;
  editing?: Booking | null;
  onClose: () => void;
  date: string;
  pcs: Pc[];
  settings: Settings;
  onCreated: (booking: Booking) => void;
  onError: (message: string) => void;
}

const LEVELS: Level[] = ['L1', 'L2', 'L3', 'L3MAX'];
const ROOMS: Room[] = ['NON_SMOKE', 'SMOKE'];
const CUSTOMER_TYPES: { value: CustomerType; label: string }[] = [
  { value: 'NON_MEMBER', label: 'Non-member' },
  { value: 'MEMBER', label: 'Member' },
];
const PACKAGE_KEYS: PackageKey[] = ['REGULER', 'PAGI', 'SIANG', 'BEGADANG'];
const activeStyle = { borderColor: 'var(--color-accent)', background: 'var(--color-accent-wash)' };
const WIDTH = 380;
const SNAP_THRESHOLD = 110;

const levelLabel = (l: Level) => (l === 'L3MAX' ? 'L3 Max' : l);
const roomLabel = (r: Room) => (r === 'SMOKE' ? 'Smoke' : 'Non-smoke');
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const nearest = (value: number, candidates: number[], threshold: number) => {
  const valid = candidates.filter((c) => Number.isFinite(c));
  if (!valid.length) return value;
  const best = valid.reduce((a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a));
  return Math.abs(best - value) <= threshold ? best : value;
};

export default function QuickAdd({ open, instant, editing, onClose, date, pcs, settings, onCreated, onError }: Props) {
  const modalRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bookingDate, setBookingDate] = useState(date);
  const [start, setStart] = useState(fmtClock(nextQuarter()));
  const [hours, setHours] = useState(2);
  const [quantity, setQuantity] = useState(1);
  const [customerType, setCustomerType] = useState<CustomerType>('NON_MEMBER');
  const [packageKey, setPackageKey] = useState<PackageKey>('REGULER');
  const [manualPc, setManualPc] = useState(false);
  const [selectedPcIds, setSelectedPcIds] = useState<string[]>([]);
  const [rangeBookings, setRangeBookings] = useState<Booking[]>([]);
  const [level, setLevel] = useState<Level>('L2');
  const [room, setRoom] = useState<Room>('NON_SMOKE');
  const [notes, setNotes] = useState('');
  const [force, setForce] = useState(false);
  const [forceReason, setForceReason] = useState('');
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.customer_name);
      setPhone(editing.phone);
      setBookingDate(editing.date);
      setStart(fmtClock(editing.start_minute));
      setHours(editing.hours);
      setQuantity(editing.quantity || 1);
      setCustomerType(editing.customer_type || 'NON_MEMBER');
      setPackageKey(editing.package || 'REGULER');
      setManualPc(true);
      setSelectedPcIds(editing.pc_ids?.length ? editing.pc_ids : [editing.pc_id]);
      setLevel(editing.level);
      setRoom(editing.room);
      setNotes(editing.notes);
    } else {
      const last = localStorage.getItem('warnet-last-type');
      if (last) {
        const [l, r] = last.split('|');
        if (LEVELS.includes(l as Level)) setLevel(l as Level);
        if (ROOMS.includes(r as Room)) setRoom(r as Room);
      }
      setBookingDate(date);
      setStart(fmtClock(nextQuarter()));
      setHours(2);
      setQuantity(1);
      setCustomerType('NON_MEMBER');
      setPackageKey('REGULER');
      setManualPc(false);
      setSelectedPcIds([]);
      setName('');
      setPhone('');
      setNotes('');
    }
    setForce(false);
    setForceReason('');
    setAvailability(null);

    const width = Math.min(WIDTH, window.innerWidth - 24);
    const height = Math.min(680, window.innerHeight - 24);
    setPos({
      x: clamp((window.innerWidth - width) / 2, 12, window.innerWidth - width - 12),
      y: clamp((window.innerHeight - height) / 2, 12, window.innerHeight - height - 12),
    });
    const timer = window.setTimeout(() => nameRef.current?.focus(), 180);
    return () => window.clearTimeout(timer);
  }, [open, date, editing]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    api.bookingsRange(addDays(bookingDate, -1), addDays(bookingDate, 2))
      .then((data) => { if (live) setRangeBookings(data); })
      .catch(() => { if (live) setRangeBookings([]); });
    return () => { live = false; };
  }, [open, bookingDate]);

  const startMinute = parseClock(start);
  const matchingPcs = useMemo(
    () => pcs.filter((pc) => pc.level === level && pc.room === room)
      .sort((a, b) => pcSortValue(a.id) - pcSortValue(b.id)),
    [pcs, level, room],
  );
  const freeIds = useMemo(
    () => startMinute === null
      ? []
      : freePcIds(pcs, rangeBookings, level, room, bookingDate, startMinute, hours),
    [pcs, rangeBookings, level, room, bookingDate, startMinute, hours],
  );
  const payload = {
    name, phone, date: bookingDate, start_minute: startMinute ?? 0, hours, level, room, quantity,
    customer_type: customerType, package: packageKey,
    ...(manualPc ? { pcIds: selectedPcIds } : {}),
  };

  useEffect(() => {
    setSelectedPcIds((current) => current
      .filter((id) => matchingPcs.some((pc) => pc.id === id))
      .slice(0, quantity));
  }, [matchingPcs, quantity]);

  useEffect(() => {
    if (!open || startMinute === null || !name.trim() || !phone.trim()) {
      setAvailability(null);
      return;
    }
    setChecking(true);
    const checkPayload: Record<string, unknown> = { ...payload, start_minute: startMinute };
    if (editing) {
      checkPayload.excludeId = editing.id;
      if (!manualPc && editing.level === level && editing.room === room) {
        checkPayload.onlyPcIds = editing.pc_ids;
      }
    }
    const timer = window.setTimeout(() => {
      api.check(checkPayload)
        .then(setAvailability)
        .catch(() => setAvailability(null))
        .finally(() => setChecking(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, name, phone, bookingDate, start, hours, level, room, quantity, customerType, packageKey, manualPc, selectedPcIds, startMinute, editing]);

  const hasErrors = Boolean(availability?.errors.length);
  const conflicted = availability ? !availability.ok : false;
  const blocked = conflicted && !force;
  const canSave = !saving && !hasErrors && !blocked
    && Boolean(name.trim() && phone.trim() && startMinute !== null)
    && (!force || Boolean(forceReason.trim()))
    && (!manualPc || selectedPcIds.length === quantity);

  function selectPackage(next: PackageKey) {
    setPackageKey(next);
    const windowInfo = packageWindow(next);
    if (windowInfo) {
      setStart(fmtClock(windowInfo.startMinute));
      setHours(windowInfo.hours);
    }
  }

  function startDrag(event: React.PointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button')) return;
    const rect = modalRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLElement>) {
    if (!dragRef.current) return;
    setPos({
      x: clamp(event.clientX - dragRef.current.dx, 0, window.innerWidth - WIDTH),
      y: clamp(event.clientY - dragRef.current.dy, 0, window.innerHeight - 80),
    });
  }

  function endDrag() {
    if (!dragRef.current) return;
    dragRef.current = null;
    const rect = modalRef.current?.getBoundingClientRect();
    if (!rect) return;
    const schedule = document.querySelector<HTMLElement>('[data-schedule]')?.getBoundingClientRect();
    const xs = [12, window.innerWidth - WIDTH - 12];
    const ys = [12, window.innerHeight - rect.height - 12];
    if (schedule) {
      xs.push(
        schedule.left + 12,
        schedule.right - WIDTH - 12,
        schedule.left - WIDTH - 12,
        schedule.right + 12,
      );
      ys.push(schedule.top + 12, schedule.bottom - rect.height - 12);
    }
    setPos({
      x: clamp(nearest(rect.left, xs, SNAP_THRESHOLD), 12, window.innerWidth - WIDTH - 12),
      y: clamp(nearest(rect.top, ys, SNAP_THRESHOLD), 12, window.innerHeight - rect.height - 12),
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const body = { ...payload, start_minute: startMinute, notes, force, forceReason };
      const booking = editing ? await api.update(editing.id, body) : await api.create(body);
      if (!editing) localStorage.setItem('warnet-last-type', `${level}|${room}`);
      onCreated(booking);
      onClose();
    } catch (error) {
      const e = error as Error & { data?: Availability };
      if (e.data?.conflicts?.length) {
        setAvailability(e.data);
        onError('Slot masih bentrok. Pilih jadwal lain atau isi alasan override.');
      } else {
        onError(e.message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open || !pos) return null;

  const compactField = 'field !py-2 !text-xs';
  const compactLabel = 'label !mb-1 !text-[11px]';

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/25" onClick={onClose} aria-hidden="true" />
      <section
        ref={modalRef}
        className={`fixed z-40 flex flex-col overflow-hidden rounded-2xl ${instant ? 'no-motion' : 'modal-pop'}`}
        style={{
          left: pos.x,
          top: pos.y,
          width: Math.min(WIDTH, window.innerWidth - 24),
          maxHeight: 'min(86dvh, 700px)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-line)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
        }}
        aria-label="Tambah booking"
      >
        <header
          className="flex shrink-0 cursor-grab items-start justify-between border-b px-4 py-3 active:cursor-grabbing"
          style={{ borderColor: 'var(--color-line)', touchAction: 'none' }}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="flex items-center gap-2">
            <DotsSix size={18} weight="bold" style={{ color: 'var(--color-muted)' }} />
            <div>
              <h2 className="text-sm font-semibold leading-tight">{editing ? 'Edit booking' : 'Booking baru'}</h2>
              <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
                {editing ? `${editing.customer_name} · ${pcNumbers(editing.pc_ids?.length ? editing.pc_ids : [editing.pc_id])}` : 'Tarik untuk memindahkan · snapping ke jadwal'}
              </p>
            </div>
          </div>
          <button type="button" className="icon-btn !h-8 !w-8" onClick={onClose} aria-label="Tutup">
            <X size={16} />
          </button>
        </header>

        <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className={compactLabel} htmlFor="qa-name">Nama</label>
                <input
                  id="qa-name"
                  ref={nameRef}
                  className={compactField}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama pelanggan"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={compactLabel} htmlFor="qa-phone">No. HP</label>
                <input
                  id="qa-phone"
                  className={`${compactField} tabular-nums`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  inputMode="tel"
                />
              </div>
              <div>
                <span className={compactLabel}>Tanggal</span>
                <DatePicker value={bookingDate} onChange={setBookingDate} label="Tanggal booking" className={compactField} />
              </div>
              <div>
                <label className={compactLabel} htmlFor="qa-start">Jam mulai</label>
                <input
                  id="qa-start"
                  type="time"
                  className={`${compactField} tabular-nums`}
                  value={start}
                  disabled={packageKey !== 'REGULER'}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div>
                <label className={compactLabel} htmlFor="qa-hours">Durasi (jam)</label>
                <div className="flex items-center gap-1">
                  <button type="button" className="icon-btn !h-8 !w-8" onClick={() => setHours((h) => Math.max(1, h - 1))} disabled={packageKey !== 'REGULER'} aria-label="Kurangi durasi">
                    <CaretLeft size={14} />
                  </button>
                  <input
                    id="qa-hours"
                    type="number"
                    min={1}
                    max={settings.max_hours}
                    className={`${compactField} !px-1 text-center font-semibold tabular-nums`}
                    value={hours}
                    disabled={packageKey !== 'REGULER'}
                    onChange={(e) => setHours(Number(e.target.value))}
                  />
                  <button type="button" className="icon-btn !h-8 !w-8" onClick={() => setHours((h) => Math.min(settings.max_hours, h + 1))} disabled={packageKey !== 'REGULER'} aria-label="Tambah durasi">
                    <CaretLeft size={14} className="rotate-180" />
                  </button>
                </div>
              </div>
              <div>
                <label className={compactLabel} htmlFor="qa-quantity">Jumlah PC</label>
                <div className="flex items-center gap-1">
                  <button type="button" className="icon-btn !h-8 !w-8" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Kurangi jumlah PC">
                    <CaretLeft size={14} />
                  </button>
                  <input
                    id="qa-quantity"
                    type="number"
                    min={1}
                    max={15}
                    className={`${compactField} !px-1 text-center font-semibold tabular-nums`}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                  <button type="button" className="icon-btn !h-8 !w-8" onClick={() => setQuantity((q) => Math.min(15, q + 1))} aria-label="Tambah jumlah PC">
                    <CaretLeft size={14} className="rotate-180" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-muted)' }}>
                <input
                  type="checkbox"
                  checked={manualPc}
                  onChange={(event) => {
                    setManualPc(event.target.checked);
                    setSelectedPcIds(event.target.checked ? freeIds.slice(0, quantity) : []);
                  }}
                />
                Pilih PC tertentu
              </label>
              {manualPc && (
                <div className="mt-1.5">
                  <div className="mb-1 flex items-center justify-between text-[10px]" style={{ color: 'var(--color-muted)' }}>
                    <span>Klik PC yang dipakai</span>
                    <span className="tabular-nums">{selectedPcIds.length}/{quantity}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {matchingPcs.map((pc) => {
                      const selected = selectedPcIds.includes(pc.id);
                      const occupied = !freeIds.includes(pc.id);
                      return (
                        <button
                          key={pc.id}
                          type="button"
                          disabled={occupied || (!selected && selectedPcIds.length >= quantity)}
                          className="btn btn-quiet !px-1 !py-1.5 !text-[10px]"
                          style={selected ? activeStyle : occupied ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
                          onClick={() => setSelectedPcIds((current) => current.includes(pc.id)
                            ? current.filter((id) => id !== pc.id)
                            : [...current, pc.id].slice(0, quantity))}
                        >
                          {pcNumber(pc.id)}
                        </button>
                      );
                    })}
                  </div>
                  {selectedPcIds.length < quantity && (
                    <p className="mt-1 text-[10px]" style={{ color: 'var(--color-danger)' }}>
                      Pilih {quantity} PC yang tersedia.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className={compactLabel}>Tipe PC</div>
              <div className="grid grid-cols-4 gap-1.5">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(l)}
                    className="btn btn-quiet !px-1 !py-1.5 !text-[11px]"
                    style={level === l ? { borderColor: 'var(--color-accent)', background: 'var(--color-accent-wash)' } : undefined}
                    aria-pressed={level === l}
                  >
                    {levelLabel(l)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className={compactLabel}>Ruangan</div>
              <div className="grid grid-cols-2 gap-1.5">
                {ROOMS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoom(r)}
                    className="btn btn-quiet !py-1.5 !text-[11px]"
                    style={room === r ? { borderColor: 'var(--color-accent)', background: 'var(--color-accent-wash)' } : undefined}
                    aria-pressed={room === r}
                  >
                    {roomLabel(r)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className={compactLabel}>Tipe pelanggan</div>
              <div className="grid grid-cols-2 gap-1.5">
                {CUSTOMER_TYPES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className="btn btn-quiet !py-1.5 !text-[11px]"
                    style={customerType === item.value ? activeStyle : undefined}
                    aria-pressed={customerType === item.value}
                    onClick={() => setCustomerType(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {customerType === 'MEMBER' && (
                <p className="mt-1 text-[10px]" style={{ color: 'var(--color-muted)' }}>
                  Member: minimal 5 jam dalam 1 transaksi.
                </p>
              )}
            </div>

            <div>
              <div className={compactLabel}>Paket</div>
              <div className="grid grid-cols-4 gap-1.5">
                {PACKAGE_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="btn btn-quiet !px-1 !py-1.5 !text-[10px]"
                    style={packageKey === key ? activeStyle : undefined}
                    aria-pressed={packageKey === key}
                    onClick={() => selectPackage(key)}
                  >
                    {key === 'REGULER' ? 'Reguler' : PACKAGES[key].label.replace('Paket ', '')}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px]" style={{ color: 'var(--color-muted)' }}>
                {packageKey === 'REGULER'
                  ? 'Reguler: tagihan dihitung per jam.'
                  : `${PACKAGES[packageKey].label} · ${PACKAGES[packageKey].window} · harga paket tetap.`}
              </p>
            </div>

            <div>
              <label className={compactLabel} htmlFor="qa-notes">Catatan</label>
              <textarea
                id="qa-notes"
                className={`${compactField} resize-none`}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Info tambahan dari WhatsApp"
              />
            </div>

            {availability && (
              <div className="rounded-xl p-2.5 text-[11px]" style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)' }}>
                {availability.errors.length > 0 && (
                  <ul className="mb-1.5 space-y-0.5" style={{ color: 'var(--color-danger)' }}>
                    {availability.errors.map((e) => <li key={e}>• {e}</li>)}
                  </ul>
                )}
                {availability.ok && (
                  <div className="flex items-start justify-between gap-2" style={{ color: 'var(--color-muted)' }}>
                    <span>PC tersedia</span>
                    <span className="text-right font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>
                      {pcNumbers((availability.pcIds.length ? availability.pcIds : [availability.pcId]).filter(Boolean) as string[])}
                    </span>
                  </div>
                )}
                {availability.conflicts.length > 0 && (
                  <div className="mt-1.5 space-y-0.5" style={{ color: 'var(--color-danger)' }}>
                    <div className="flex items-center gap-1 font-semibold"><Warning size={13} /> Bentrok:</div>
                    {availability.conflicts.map((c) => (
                      <div key={c.id} className="pl-4">
                        {c.customerName} · {fmtClock(c.startMinute)} · {c.hours}j · {c.pcId}
                      </div>
                    ))}
                  </div>
                )}
                {availability.nextStart !== null && (
                  <button
                    type="button"
                    className="btn btn-quiet mt-1.5 w-full !py-1 !text-[11px]"
                    onClick={() => setStart(fmtClock(availability.nextStart!))}
                  >
                    Kosong pertama: {fmtClock(availability.nextStart)}
                  </button>
                )}
                {availability.maxHours > 0 && availability.maxHours < hours && (
                  <button
                    type="button"
                    className="btn btn-quiet mt-1.5 w-full !py-1 !text-[11px]"
                    onClick={() => setHours(availability.maxHours)}
                  >
                    Maksimal {availability.maxHours} jam — pakai
                  </button>
                )}
                {availability.alternatives.length > 0 && (
                  <div className="mt-1.5">
                    <div style={{ color: 'var(--color-muted)' }}>Alternatif:</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {availability.alternatives.map((a) => (
                        <button
                          key={`${a.level}-${a.room}`}
                          type="button"
                          className="chip !px-2 !py-0.5 !text-[10px]"
                          onClick={() => { setLevel(a.level); setRoom(a.room); }}
                        >
                          {levelLabel(a.level)} {roomLabel(a.room)} · {a.count}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <label className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-muted)' }}>
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
              Paksa simpan meski bentrok
            </label>
            {force && (
              <input
                className={compactField}
                value={forceReason}
                onChange={(e) => setForceReason(e.target.value)}
                placeholder="Alasan override"
                aria-label="Alasan override"
              />
            )}
          </div>

          <div className="shrink-0 border-t px-4 py-3" style={{ borderColor: 'var(--color-line)' }}>
            <div className="mb-2 flex items-end justify-between">
              <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>Estimasi</span>
              <span className="text-lg font-semibold tabular-nums" style={{ color: 'var(--color-accent-strong)' }}>
                {fmtRupiah(bookingPrice(level, hours, quantity, customerType, packageKey))}
              </span>
            </div>
            <button type="submit" className="btn btn-primary w-full !py-2.5" disabled={!canSave}>
              {saving ? 'Menyimpan…' : checking ? 'Mengecek…' : editing ? 'Simpan perubahan' : 'Simpan booking'}
            </button>
            {blocked && <p className="mt-1.5 text-center text-[10px]" style={{ color: 'var(--color-danger)' }}>Atasi bentrok atau centang paksa simpan.</p>}
            {force && !forceReason.trim() && <p className="mt-1.5 text-center text-[10px]" style={{ color: 'var(--color-danger)' }}>Alasan override wajib diisi.</p>}
            {bookingDate !== todayKey() && <p className="mt-1.5 text-center text-[10px]" style={{ color: 'var(--color-muted)' }}>Booking tanggal lain.</p>}
          </div>
        </form>
      </section>
    </>
  );
}
