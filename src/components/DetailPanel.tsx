import { useMemo, useState } from 'react';
import { Copy, PencilSimple, Warning, X } from '@phosphor-icons/react';
import type { Booking, Settings, Status } from '../types';
import { api } from '../api';
import {
  bookingInterval,
  fmtClock,
  fmtDate,
  fmtRupiah,
  isLate,
  nowAbs,
  toAbs,
} from '../lib/time';
import { bookingPrice } from '../lib/pricing';
import { pcNumbers } from '../lib/pcNumbers';

interface Props {
  booking: Booking | null;
  allBookings: Booking[];
  settings: Settings;
  onClose: () => void;
  onEdit: (booking: Booking) => void;
  onUpdate: (booking: Booking) => void;
  onToast: (message: string, tone?: 'success' | 'error', undoId?: string) => void;
}

const statusLabel: Record<Status, string> = {
  BOOKED: 'Dipesan',
  CHECKED_IN: 'Main',
  DONE: 'Selesai',
  CANCELLED: 'Dibatalkan',
  NO_SHOW: 'No-show',
};

export default function DetailPanel({ booking, allBookings, settings, onClose, onEdit, onUpdate, onToast }: Props) {
  const [extendHours, setExtendHours] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const nextBooking = useMemo(() => {
    if (!booking) return null;
    const start = bookingInterval(booking).start;
    return allBookings
      .filter((b) => b.id !== booking.id && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW'
        && (b.pc_ids || [b.pc_id]).some((pc) => booking.pc_ids.includes(pc)))
      .map((b) => ({ b, iv: bookingInterval(b) }))
      .filter(({ iv }) => iv.start >= start)
      .sort((a, b) => a.iv.start - b.iv.start)[0]?.b ?? null;
  }, [booking, allBookings]);

  const maxHours = useMemo(() => {
    if (!booking) return settings.max_hours;
    if (!nextBooking) return settings.max_hours;
    const gap = toAbs(nextBooking.date, nextBooking.start_minute) - toAbs(booking.date, booking.start_minute);
    return Math.max(booking.hours, Math.min(settings.max_hours, Math.floor(gap / 60)));
  }, [booking, nextBooking, settings.max_hours]);

  if (!booking) return null;

  async function run(action: () => Promise<Booking>, message: string) {
    setBusy(true);
    try {
      const updated = await action();
      onUpdate(updated);
      onToast(message, 'success', updated.id);
    } catch (error) {
      onToast((error as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function copyWa() {
    if (!booking) return;
    const endMinutes = booking.start_minute + booking.hours * 60;
    const text = settings.wa_template
      .replaceAll('{name}', booking.customer_name)
      .replaceAll('{date}', fmtDate(booking.date))
      .replaceAll('{start}', fmtClock(booking.start_minute))
      .replaceAll('{end}', fmtClock(endMinutes))
      .replaceAll('{level}', booking.level === 'L3MAX' ? 'L3 Max' : booking.level)
      .replaceAll('{room}', booking.room === 'SMOKE' ? 'Smoke' : 'Non-smoke')
      .replaceAll('{hours}', String(booking.hours))
      .replaceAll('{total}', String(bookingPrice(
        booking.level, booking.hours, booking.quantity,
        booking.customer_type || 'NON_MEMBER', booking.package || 'REGULER',
      )))
      .replaceAll('{phone}', booking.phone);
    navigator.clipboard.writeText(text)
      .then(() => onToast('Teks WhatsApp disalin', 'success'))
      .catch(() => onToast('Gagal menyalin teks', 'error'));
  }

  const active = booking.status === 'BOOKED' || booking.status === 'CHECKED_IN';

  return (
    <aside
      className="sheet flex w-full flex-col md:w-[360px] shrink-0"
      style={{ background: 'var(--color-surface)', borderLeft: '1px solid var(--color-line)' }}
      aria-label="Detail booking"
    >
      <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--color-line)' }}>
        <div>
          <h2 className="text-base font-semibold">{booking.customer_name}</h2>
          <p className="text-xs tabular-nums" style={{ color: 'var(--color-muted)' }}>{booking.phone}</p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup detail">
          <X size={20} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">{statusLabel[booking.status]}</span>
          <span className="chip tabular-nums">{pcNumbers(booking.pc_ids || [booking.pc_id])}</span>
          {booking.quantity > 1 && <span className="chip">×{booking.quantity} PC</span>}
          {isLate(booking, settings) && (
            <span className="chip" style={{ color: 'var(--color-warn)', background: 'var(--color-warn-wash)', borderColor: 'transparent' }}>
              <Warning size={13} /> LATE &gt;{settings.late_minutes}m
            </span>
          )}
          {booking.force_reason && (
            <span className="chip" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-wash)', borderColor: 'transparent' }}>
              Override: {booking.force_reason}
            </span>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs" style={{ color: 'var(--color-muted)' }}>Tanggal</dt>
            <dd className="font-medium">{fmtDate(booking.date)}</dd>
          </div>
          <div>
            <dt className="text-xs" style={{ color: 'var(--color-muted)' }}>Jam</dt>
            <dd className="font-medium tabular-nums">{fmtClock(booking.start_minute)} – {fmtClock(booking.start_minute + booking.hours * 60)}</dd>
          </div>
          <div>
            <dt className="text-xs" style={{ color: 'var(--color-muted)' }}>PC</dt>
            <dd className="font-medium">{booking.level === 'L3MAX' ? 'L3 Max' : booking.level} · {booking.room === 'SMOKE' ? 'Smoke' : 'Non-smoke'}</dd>
          </div>
          <div>
            <dt className="text-xs" style={{ color: 'var(--color-muted)' }}>Durasi</dt>
            <dd className="font-medium tabular-nums">{booking.hours} jam</dd>
          </div>
        </dl>

        <div className="rounded-xl p-3" style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)' }}>
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Tagihan</div>
          <div className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--color-accent-strong)' }}>
            {fmtRupiah(bookingPrice(
              booking.level, booking.hours, booking.quantity,
              booking.customer_type || 'NON_MEMBER', booking.package || 'REGULER',
            ))}
          </div>
          <div className="text-[11px] tabular-nums" style={{ color: 'var(--color-muted)' }}>
            {booking.package && booking.package !== 'REGULER'
              ? `${booking.package === 'BEGADANG' ? 'Paket Begadang' : booking.package === 'SIANG' ? 'Paket Siang' : 'Paket Pagi'}`
              : `${booking.hours} jam · ${booking.customer_type === 'MEMBER' ? 'Member' : 'Non-member'}`}
            {booking.quantity > 1 ? ` × ${booking.quantity} PC` : ''}
          </div>
        </div>

        {nextBooking && (
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Booking berikutnya di PC ini: <span className="font-medium" style={{ color: 'var(--color-ink)' }}>{nextBooking.customer_name} · {fmtClock(nextBooking.start_minute)}</span>
          </div>
        )}

        {booking.notes && (
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Catatan: {booking.notes}</div>
        )}

        {active && (
          <div>
            <div className="label">Perpanjang durasi</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="field tabular-nums"
                min={booking.hours + 1}
                max={maxHours}
                value={extendHours ?? ''}
                placeholder={`${booking.hours + 1}–${maxHours}`}
                onChange={(e) => setExtendHours(Number(e.target.value))}
              />
              <button
                type="button"
                className="btn btn-quiet"
                disabled={busy || !extendHours || extendHours <= booking.hours || extendHours > maxHours}
                onClick={() => extendHours && run(() => api.extend(booking.id, extendHours), 'Durasi diperbarui')}
              >
                Update
              </button>
            </div>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--color-muted)' }}>Maksimal {maxHours} jam{nextBooking ? ' sebelum booking berikutnya' : ''}.</p>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t px-5 py-4" style={{ borderColor: 'var(--color-line)' }}>
        <button type="button" className="btn btn-quiet w-full" onClick={() => onEdit(booking)}>
          <PencilSimple size={16} /> Edit booking
        </button>
        <button type="button" className="btn btn-quiet w-full" onClick={copyWa}>
          <Copy size={16} /> Salin teks WhatsApp
        </button>
        {booking.status === 'BOOKED' && (
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={busy}
            onClick={() => run(() => api.setStatus(booking.id, 'CHECKED_IN'), 'Check-in tercatat')}
          >
            Check-in
          </button>
        )}
        {booking.status === 'CHECKED_IN' && (
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={busy}
            onClick={() => run(() => api.setStatus(booking.id, 'DONE'), 'Booking selesai')}
          >
            Tandai selesai
          </button>
        )}
        {active && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => run(() => api.setStatus(booking.id, 'NO_SHOW'), 'Ditandai no-show')}>
              No-show
            </button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => run(() => api.cancel(booking.id), 'Booking dibatalkan')}>
              Batalkan
            </button>
          </div>
        )}
        {nowAbs() > toAbs(booking.date, booking.start_minute) + settings.late_minutes && booking.status === 'BOOKED' && (
          <p className="text-center text-[11px]" style={{ color: 'var(--color-warn)' }}>
            Lewat batas {settings.late_minutes} menit. Flag saja — tidak auto-batal.
          </p>
        )}
      </div>
    </aside>
  );
}
