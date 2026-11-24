import { Check, X } from '@phosphor-icons/react';
import type { Pc } from '../types';
import { PC_NUMBERS } from '../lib/pcNumbers';

interface Props {
  open: boolean;
  onClose: () => void;
  pcs: Pc[];
  usedPcs: string[];
  syncEnabled: boolean;
  onToggle: (pcId: string) => void;
}

const BORDER_COLORS = {
  L1: '#9ca3af',
  L2: '#3b82f6',
  L3: '#facc15',
  L3MAX: '#ef4444',
  SMOKE: '#22c55e',
};

interface Slot {
  pcId?: string;
  crossed?: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
}

const WALL_WIDTH = 190;
const WALL_HEIGHT = 400;
const PC_SIZE = 48;
const LEFT_X = 12;
const RIGHT_X = 130;
const ROW_STEP = 56;

// Positions follow the whiteboard: outer box = wall, inner boxes = PC placements.
const FIRST_FLOOR_SLOTS: Slot[] = [
  { crossed: true, left: LEFT_X, top: 12, width: PC_SIZE, height: PC_SIZE },
  { pcId: 'L3-NS-1', left: LEFT_X, top: 68, width: PC_SIZE, height: PC_SIZE },
  { pcId: 'L3-NS-2', left: LEFT_X, top: 124, width: PC_SIZE, height: PC_SIZE },
  { pcId: 'L3MAX-NS-1', left: LEFT_X, top: 180, width: PC_SIZE, height: PC_SIZE * 2 },
  { pcId: 'L2-NS-1', left: RIGHT_X, top: 12, width: PC_SIZE, height: PC_SIZE },
  { pcId: 'L2-NS-2', left: RIGHT_X, top: 68, width: PC_SIZE, height: PC_SIZE },
  { pcId: 'L2-NS-3', left: RIGHT_X, top: 124, width: PC_SIZE, height: PC_SIZE },
  { pcId: 'L2-NS-4', left: RIGHT_X, top: 180, width: PC_SIZE, height: PC_SIZE },
  { pcId: 'L1-NS-1', left: RIGHT_X, top: 236, width: PC_SIZE, height: PC_SIZE },
  { pcId: 'L1-NS-2', left: RIGHT_X, top: 292, width: PC_SIZE, height: PC_SIZE },
];

const SECOND_FLOOR_SLOTS: Slot[] = ['L2-SM-1', 'L2-SM-2', 'L2-SM-3', 'L2-SM-4', 'L2-SM-5', 'L2-SM-6']
  .map((pcId, index) => ({
    pcId,
    left: RIGHT_X,
    top: 12 + index * ROW_STEP,
    width: PC_SIZE,
    height: PC_SIZE,
  }));

export default function LayoutModal({ open, onClose, pcs, usedPcs, syncEnabled, onToggle }: Props) {
  if (!open) return null;

  const byId = (id: string) => pcs.find((pc) => pc.id === id);
  const isUsed = (id: string) => usedPcs.includes(id);
  const usedCount = usedPcs.length;

  function renderSlot(slot: Slot, key: string) {
    const position: React.CSSProperties = {
      left: slot.left,
      top: slot.top,
      width: slot.width,
      height: slot.height,
    };

    if (slot.crossed) {
      return (
        <div
          key={key}
          className="absolute flex items-center justify-center rounded-sm border-2 border-dashed"
          style={{ ...position, borderColor: BORDER_COLORS.L1, color: 'var(--color-muted)' }}
        >
          <span className="flex flex-col items-center leading-none">
            <X size={13} />
            <span className="mt-0.5 text-[8px]">7</span>
          </span>
        </div>
      );
    }

    const pc = slot.pcId ? byId(slot.pcId) : undefined;
    if (!pc) return null;
    const used = isUsed(pc.id);
    const border = pc.room === 'SMOKE' ? BORDER_COLORS.SMOKE : BORDER_COLORS[pc.level];
    return (
      <button
        key={key}
        type="button"
        aria-pressed={used}
        disabled={syncEnabled}
        title={syncEnabled
          ? `${pc.id} — ${used ? 'sedang dibooking' : 'kosong'} (auto dari booking)`
          : `${pc.id} — ${used ? 'sedang dipakai' : 'kosong'}`}
        onClick={() => onToggle(pc.id)}
        className="absolute flex items-center justify-center rounded-sm text-[10px] font-semibold tabular-nums transition-[background-color,box-shadow,transform] duration-150 ease-out active:scale-95"
        style={{
          ...position,
          background: used ? 'var(--color-ink)' : 'var(--color-surface)',
          color: used ? 'var(--color-surface)' : 'var(--color-ink)',
          border: `2px solid ${border}`,
          boxShadow: used ? '0 0 0 2px color-mix(in srgb, var(--color-accent) 22%, transparent)' : 'none',
          cursor: syncEnabled ? 'default' : 'pointer',
        }}
      >
        {used ? <Check size={13} weight="bold" /> : (PC_NUMBERS[pc.id] ?? '?')}
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30" onClick={onClose} aria-hidden="true" />
      <section
        className="modal-pop fixed left-1/2 top-1/2 z-40 w-[min(620px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl"
        style={{
          maxHeight: 'min(92dvh, 800px)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-line)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
        }}
        aria-label="Denah warnet"
      >
        <header className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: 'var(--color-line)' }}>
          <div>
            <h2 className="text-sm font-semibold">Denah warnet</h2>
            <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
              Kotak luar = dinding, kotak = PC 1:1. Border menentukan level; hanya L3 Max yang lebih panjang. {syncEnabled ? 'Okupansi otomatis dari booking.' : 'Klik PC untuk menandai dipakai.'}
            </p>
          </div>
          <button type="button" className="icon-btn !h-8 !w-8" onClick={onClose} aria-label="Tutup denah">
            <X size={16} />
          </button>
        </header>

        <div className="max-h-[66dvh] overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap justify-center gap-6">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold">Lantai 1 · Non-smoke</span>
                <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-muted)' }}>
                  {usedPcs.filter((id) => !id.includes('-SM-')).length} dipakai
                </span>
              </div>
              <div className="relative rounded-sm" style={{ width: WALL_WIDTH, height: WALL_HEIGHT, border: '2px solid var(--color-ink)' }}>
                {FIRST_FLOOR_SLOTS.map((slot, index) => renderSlot(slot, `first-${index}`))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold">Lantai 2 · Smoke</span>
                <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-muted)' }}>
                  {usedPcs.filter((id) => id.includes('-SM-')).length} dipakai
                </span>
              </div>
              <div className="relative rounded-sm" style={{ width: WALL_WIDTH, height: WALL_HEIGHT, border: '2px solid var(--color-ink)' }}>
                {SECOND_FLOOR_SLOTS.map((slot, index) => renderSlot(slot, `second-${index}`))}
              </div>
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-5 py-3 text-[10px]" style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}>
          {[
            ['L1', BORDER_COLORS.L1],
            ['L2', BORDER_COLORS.L2],
            ['L3', BORDER_COLORS.L3],
            ['L3 Max', BORDER_COLORS.L3MAX],
            ['L2 Smoke', BORDER_COLORS.SMOKE],
          ].map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5">
              <i className="inline-block h-3 w-3 rounded-sm bg-transparent" style={{ border: `2px solid ${color}` }} />
              {label}
            </span>
          ))}
          <span className="ml-auto tabular-nums">
            {syncEnabled ? 'Auto booking' : 'Manual admin'} · {usedCount} PC dipakai
          </span>
        </footer>
      </section>
    </>
  );
}
