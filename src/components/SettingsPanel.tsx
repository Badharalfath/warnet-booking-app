import { useEffect, useRef, useState } from 'react';
import { DotsSix, X } from '@phosphor-icons/react';
import type { Settings } from '../types';
import { api } from '../api';
import { fmtRupiah } from '../lib/time';

interface Props {
  open: boolean;
  instant: boolean;
  onClose: () => void;
  settings: Settings;
  onSaved: (settings: Settings) => void;
  onError: (message: string) => void;
}

const WIDTH = 420;
const SNAP_THRESHOLD = 110;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const nearest = (value: number, candidates: number[], threshold: number) => {
  const valid = candidates.filter((c) => Number.isFinite(c));
  if (!valid.length) return value;
  const best = valid.reduce((a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a));
  return Math.abs(best - value) <= threshold ? best : value;
};

export default function SettingsPanel({ open, instant, onClose, settings, onSaved, onError }: Props) {
  const modalRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(settings);
    const width = Math.min(WIDTH, window.innerWidth - 24);
    const height = Math.min(640, window.innerHeight - 24);
    setPos({
      x: clamp((window.innerWidth - width) / 2, 12, window.innerWidth - width - 12),
      y: clamp((window.innerHeight - height) / 2, 12, window.innerHeight - height - 12),
    });
  }, [open, settings]);

  const set = (key: keyof Settings, value: string | number | boolean) => setDraft((d) => ({ ...d, [key]: value }));

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
      xs.push(schedule.left + 12, schedule.right - WIDTH - 12, schedule.left - WIDTH - 12, schedule.right + 12);
      ys.push(schedule.top + 12, schedule.bottom - rect.height - 12);
    }
    setPos({
      x: clamp(nearest(rect.left, xs, SNAP_THRESHOLD), 12, window.innerWidth - WIDTH - 12),
      y: clamp(nearest(rect.top, ys, SNAP_THRESHOLD), 12, window.innerHeight - rect.height - 12),
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      onSaved(await api.saveSettings(draft));
      onClose();
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!open || !pos) return null;

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
          maxHeight: 'min(86dvh, 680px)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-line)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
        }}
        aria-label="Pengaturan"
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
              <h2 className="text-sm font-semibold leading-tight">Pengaturan</h2>
              <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Tarif dan aturan booking warnet</p>
            </div>
          </div>
          <button type="button" className="icon-btn !h-8 !w-8" onClick={onClose} aria-label="Tutup">
            <X size={16} />
          </button>
        </header>

        <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Tarif per jam</span>
                <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>diisi dalam Rupiah</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['L1', 'L2', 'L3', 'L3MAX'] as const).map((level) => (
                  <label key={level} className="block rounded-xl p-2.5" style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)' }}>
                    <span className="label !mb-1">{level === 'L3MAX' ? 'L3 Max' : level}</span>
                    <input
                      type="number"
                      min={0}
                      className="field !py-2 !text-xs tabular-nums"
                      value={draft[`rate_${level}`]}
                      onChange={(e) => set(`rate_${level}`, Number(e.target.value))}
                    />
                    <span className="mt-1 block text-[10px]" style={{ color: 'var(--color-accent-strong)' }}>
                      {fmtRupiah(draft[`rate_${level}`])} / jam
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Aturan booking</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block rounded-xl p-2.5" style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)' }}>
                  <span className="label !mb-1">Batas telat (menit)</span>
                  <input type="number" min={0} className="field !py-2 !text-xs tabular-nums" value={draft.late_minutes} onChange={(e) => set('late_minutes', Number(e.target.value))} />
                  <span className="mt-1 block text-[10px]" style={{ color: 'var(--color-muted)' }}>Flag saja, tidak auto-batal</span>
                </label>
                <label className="block rounded-xl p-2.5" style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)' }}>
                  <span className="label !mb-1">Durasi maksimal (jam)</span>
                  <input type="number" min={1} max={24} className="field !py-2 !text-xs tabular-nums" value={draft.max_hours} onChange={(e) => set('max_hours', Number(e.target.value))} />
                  <span className="mt-1 block text-[10px]" style={{ color: 'var(--color-muted)' }}>Batas satu booking</span>
                </label>
              </div>
              <label className="mt-2 flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)' }}>
                <span>
                  <span className="block text-xs font-medium">Sinkron okupansi dari booking</span>
                  <span className="block text-[10px]" style={{ color: 'var(--color-muted)' }}>
                    PC yang sedang dibooking otomatis ditandai dipakai di denah.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={draft.occupancy_sync}
                  onChange={(event) => set('occupancy_sync', event.target.checked)}
                />
              </label>
            </div>

            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Pesan WhatsApp</div>
              <label className="block rounded-xl p-2.5" style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)' }}>
                <span className="label !mb-1">Template konfirmasi</span>
                <textarea
                  className="field min-h-32 resize-y font-mono !text-[11px] leading-relaxed"
                  value={draft.wa_template}
                  onChange={(e) => set('wa_template', e.target.value)}
                />
                <span className="mt-1 block text-[10px]" style={{ color: 'var(--color-muted)' }}>
                  {'{name}, {date}, {start}, {end}, {level}, {room}, {hours}, {total}, {phone}'}
                </span>
              </label>
            </div>
          </div>

          <div className="shrink-0 border-t px-4 py-3" style={{ borderColor: 'var(--color-line)' }}>
            <button type="submit" className="btn btn-primary w-full !py-2.5" disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan pengaturan'}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
