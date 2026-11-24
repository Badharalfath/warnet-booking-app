import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { fmtDate, todayKey } from '../lib/time';

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const pad = (n: number) => String(n).padStart(2, '0');
const utcKey = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export default function DatePicker({ value, onChange, label, className = '' }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [view, setView] = useState(() => {
    const [y, m] = value.split('-').map(Number);
    return { y, m: m - 1 };
  });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const height = 320;
    const top = rect.bottom + 6 + height > window.innerHeight
      ? Math.max(8, rect.top - height - 6)
      : rect.bottom + 6;
    setPos({ top, left: Math.min(rect.left, window.innerWidth - 296) });
    const [y, m] = value.split('-').map(Number);
    setView({ y, m: m - 1 });
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (triggerRef.current?.contains(event.target as Node) || popRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const onScroll = () => setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const first = new Date(Date.UTC(view.y, view.m, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(Date.UTC(view.y, view.m, 1 - offset + i));
    return { date, key: utcKey(date), inMonth: date.getUTCMonth() === view.m };
  });
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(first);
  const today = todayKey();

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(view.y, view.m + delta, 1));
    setView({ y: next.getUTCFullYear(), m: next.getUTCMonth() });
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`field flex items-center justify-between gap-2 ${className}`}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((state) => !state)}
      >
        <span key={value} className="date-swap truncate tabular-nums">{fmtDate(value)}</span>
        <CalendarBlank size={15} className="shrink-0" style={{ color: 'var(--color-muted)' }} />
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          role="dialog"
          className="popover fixed z-50 w-[288px] rounded-2xl p-3"
          style={{
            top: pos.top,
            left: pos.left,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
            transformOrigin: 'top',
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className="icon-btn !h-8 !w-8" onClick={() => shiftMonth(-1)} aria-label="Bulan sebelumnya">
              <CaretLeft size={15} />
            </button>
            <span className="text-xs font-semibold capitalize">{monthName}</span>
            <button type="button" className="icon-btn !h-8 !w-8" onClick={() => shiftMonth(1)} aria-label="Bulan berikutnya">
              <CaretRight size={15} />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((day) => (
              <span key={day} className="text-center text-[10px] font-semibold" style={{ color: 'var(--color-muted)' }}>{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell) => {
              const selected = cell.key === value;
              const isToday = cell.key === today;
              return (
                <button
                  key={cell.key}
                  type="button"
                  className="flex h-8 items-center justify-center rounded-lg text-[11px] tabular-nums"
                  style={{
                    color: selected ? '#04130e' : cell.inMonth ? 'var(--color-ink)' : 'var(--color-muted)',
                    background: selected ? 'var(--color-accent)' : isToday ? 'var(--color-accent-wash)' : 'transparent',
                    fontWeight: selected || isToday ? 700 : 400,
                    opacity: cell.inMonth ? 1 : 0.5,
                  }}
                  onClick={() => { onChange(cell.key); setOpen(false); }}
                >
                  {cell.date.getUTCDate()}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="btn btn-quiet mt-2 w-full !py-1.5 text-[11px]"
            onClick={() => { onChange(today); setOpen(false); }}
          >
            Hari ini
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
