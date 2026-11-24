import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  GearSix,
  List,
  MagnifyingGlass,
  MapTrifold,
  Moon,
  Plus,
  SquaresFour,
  Sun,
} from '@phosphor-icons/react';
import type { Booking, Level, Pc, Room, Settings, ToastItem } from './types';
import { api } from './api';
import {
  addDays,
  bookingInterval,
  fmtClock,
  fmtDate,
  fmtRupiah,
  isActive,
  isLate,
  nowAbs,
  todayKey,
} from './lib/time';
import Timeline from './components/Timeline';
import DatePicker from './components/DatePicker';
import QuickAdd from './components/QuickAdd';
import DetailPanel from './components/DetailPanel';
import SettingsPanel from './components/SettingsPanel';
import ToastStack from './components/ToastStack';
import LayoutModal from './components/LayoutModal';
import { bookingPrice } from './lib/pricing';
import { pcNumber, pcNumbers } from './lib/pcNumbers';

const levelLabel = (l: Level) => (l === 'L3MAX' ? 'L3 Max' : l);

const ROOM_BUTTONS: { value: 'ALL' | Room; label: string }[] = [
  { value: 'ALL', label: 'Semua' },
  { value: 'NON_SMOKE', label: 'Non-smoke' },
  { value: 'SMOKE', label: 'Smoke' },
];
const LEVEL_BUTTONS: { value: 'ALL' | Level; label: string }[] = [
  { value: 'ALL', label: 'Semua' },
  { value: 'L1', label: 'L1' },
  { value: 'L2', label: 'L2' },
  { value: 'L3', label: 'L3' },
  { value: 'L3MAX', label: 'L3 Max' },
];

const statusLabel: Record<string, string> = {
  BOOKED: 'Dipesan', CHECKED_IN: 'Main', DONE: 'Selesai', CANCELLED: 'Batal', NO_SHOW: 'No-show',
};

interface Props {
  initialDark: boolean;
}

export default function App({ initialDark }: Props) {
  const [dark, setDark] = useState(initialDark);
  const [date, setDate] = useState(todayKey());
  const [pcs, setPcs] = useState<Pc[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [timelineBookings, setTimelineBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedOnce = useRef(false);
  const [view, setView] = useState<'timeline' | 'list'>('timeline');
  const [roomFilter, setRoomFilter] = useState<'ALL' | Room>('ALL');
  const [levelFilter, setLevelFilter] = useState<'ALL' | Level>('ALL');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [layoutBookings, setLayoutBookings] = useState<Booking[]>([]);
  const [instant, setInstant] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string, tone: 'success' | 'error' = 'success', undoId?: string) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone, undoId }]);
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 5000);
  }, []);

  const refresh = useCallback(async () => {
    const [day, range] = await Promise.all([
      api.bookings(date),
      api.bookingsRange(addDays(date, -3), addDays(date, 4)),
    ]);
    setBookings(day);
    setTimelineBookings(range);
  }, [date]);

  useEffect(() => {
    Promise.all([api.pcs(), api.settings()])
      .then(([p, s]) => { setPcs(p); setSettings(s); })
      .catch((e) => pushToast(e.message, 'error'));
  }, [pushToast]);

  useEffect(() => {
    if (!layoutOpen) return;
    let live = true;
    const today = todayKey();
    api.bookingsRange(addDays(today, -1), addDays(today, 2))
      .then((data) => { if (live) setLayoutBookings(data); })
      .catch(() => { if (live) setLayoutBookings([]); });
    return () => { live = false; };
  }, [layoutOpen]);

  useEffect(() => {
    let live = true;
    if (!loadedOnce.current) setLoading(true);
    Promise.all([
      api.bookings(date),
      api.bookingsRange(addDays(date, -3), addDays(date, 4)),
    ])
      .then(([day, range]) => {
        if (!live) return;
        setBookings(day);
        setTimelineBookings(range);
        loadedOnce.current = true;
      })
      .catch((e) => pushToast(e.message, 'error'))
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [date, pushToast]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        setEditing(null);
        setInstant(true);
        setQuickAddOpen(true);
      } else if (event.key === '/') {
        event.preventDefault();
        document.getElementById('search-filter')?.focus();
      } else if (event.key === 'Escape') {
        setQuickAddOpen(false);
        setSettingsOpen(false);
        setLayoutOpen(false);
        setSelected(null);
      } else if (event.key === 'ArrowLeft') {
        setDate((d) => addDays(d, -1));
      } else if (event.key === 'ArrowRight') {
        setDate((d) => addDays(d, 1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function pcCount(room: 'ALL' | Room, level: 'ALL' | Level) {
    return pcs.filter((pc) =>
      (room === 'ALL' || pc.room === room) && (level === 'ALL' || pc.level === level)).length;
  }

  function filterGroup<T extends string>(
    title: string,
    options: { value: T; label: string }[],
    current: T,
    set: (value: T) => void,
    countFor: (value: T) => number,
  ) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{title}</span>
        <div className="flex items-center gap-1">
          {options.map((option) => {
            const active = current === option.value;
            const count = countFor(option.value);
            const disabled = count === 0;
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                title={disabled ? `Tidak ada PC untuk ${option.label}` : option.label}
                onClick={() => set(current === option.value ? options[0].value : option.value)}
                className="btn btn-quiet !px-2.5 !py-1.5 !text-[11px]"
                style={active
                  ? { borderColor: 'var(--color-accent)', background: 'var(--color-accent-wash)', color: 'var(--color-accent-strong)', fontWeight: 600 }
                  : disabled
                    ? { opacity: 0.35, cursor: 'not-allowed' }
                    : undefined}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  async function toggleUsedPc(pcId: string) {
    const current = settings?.pc_used ?? [];
    const next = current.includes(pcId)
      ? current.filter((id) => id !== pcId)
      : [...current, pcId];
    try {
      const updated = await api.saveSettings({ pc_used: next });
      setSettings(updated);
    } catch (error) {
      pushToast((error as Error).message, 'error');
    }
  }

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    localStorage.setItem('warnet-theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  }

  function openQuickAdd() {
    setEditing(null);
    setInstant(false);
    setQuickAddOpen(true);
  }

  function openEdit(booking: Booking) {
    setEditing(booking);
    setInstant(false);
    setQuickAddOpen(true);
  }

  async function handleMove(booking: Booking, targetDate: string, startMinute: number, pcId: string) {
    try {
      const updated = await api.move(booking.id, targetDate, startMinute, pcId);
      setBookings((current) => current.map((b) => (b.id === updated.id ? updated : b)));
      setTimelineBookings((current) => current.map((b) => (b.id === updated.id ? updated : b)));
      setSelected((current) => (current?.id === updated.id ? updated : current));
      pushToast(`Dipindah ke ${fmtClock(startMinute)} · ${pcNumber(pcId)}`);
    } catch (error) {
      pushToast((error as Error).message, 'error');
    }
  }

  const autoUsedPcs = useMemo(() => {
    const now = nowAbs();
    return layoutBookings
      .filter(isActive)
      .filter((b) => {
        const iv = bookingInterval(b);
        return iv.start <= now && now < iv.end;
      })
      .flatMap((b) => b.pc_ids?.length ? b.pc_ids : [b.pc_id]);
  }, [layoutBookings]);

  const usedPcs = settings?.occupancy_sync ? autoUsedPcs : (settings?.pc_used ?? []);

  const visible = useMemo(() => bookings.filter((b) => {
    if (roomFilter !== 'ALL' && b.room !== roomFilter) return false;
    if (levelFilter !== 'ALL' && b.level !== levelFilter) return false;
    if (query && !`${b.customer_name} ${b.phone} ${b.pc_id}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [bookings, roomFilter, levelFilter, query]);

  const stats = useMemo(() => {
    const active = bookings.filter(isActive);
    const now = nowAbs();
    const inSession = active.filter((b) => {
      const iv = bookingInterval(b);
      return iv.start <= now && now < iv.end;
    });
    const dayRevenue = active.reduce((sum, b) => sum + bookingPrice(
      b.level, b.hours, b.quantity,
      b.customer_type || 'NON_MEMBER', b.package || 'REGULER',
    ), 0);
    const soon = active.filter((b) => {
      const iv = bookingInterval(b);
      return iv.start > now && iv.start <= now + 120;
    });
    const late = active.filter((b) => settings && isLate(b, settings)).length;
    return { total: active.length, inSession: inSession.length, dayRevenue, soon, late };
  }, [bookings, settings]);

  if (!settings) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="skeleton h-10 w-56 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b px-4 py-3 md:px-6" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line)' }}>
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3">
          <div className="mr-auto flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'var(--color-accent-wash)', color: 'var(--color-accent-strong)' }}>
              <CalendarBlank size={22} weight="duotone" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Warnet Booking Planner</h1>
              <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>Jadwal PC dan tagihan dalam satu layar</p>
            </div>
          </div>

          <div className="flex w-full items-center justify-between gap-1.5 sm:w-auto sm:justify-start">
            <button type="button" className="icon-btn" onClick={() => setDate((d) => addDays(d, -1))} aria-label="Hari sebelumnya"><CaretLeft size={18} /></button>
            <DatePicker value={date} onChange={setDate} label="Tanggal" className="!w-auto" />
            <button type="button" className="icon-btn" onClick={() => setDate((d) => addDays(d, 1))} aria-label="Hari berikutnya"><CaretRight size={18} /></button>
            {date !== todayKey() && (
              <button type="button" className="btn btn-quiet !px-3 text-xs" onClick={() => setDate(todayKey())}>Hari ini</button>
            )}
          </div>

          <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
            <div className="relative hidden sm:block">
              <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
              <input
                id="search-filter"
                className="field !w-44 !pl-9"
                placeholder="Cari nama / HP"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {filterGroup('Ruangan', ROOM_BUTTONS, roomFilter, setRoomFilter, (value) => pcCount(value, levelFilter))}
            {filterGroup('Level', LEVEL_BUTTONS, levelFilter, setLevelFilter, (value) => pcCount(roomFilter, value))}
            <div className="ml-auto flex items-center gap-2">
              <button type="button" className="icon-btn" onClick={() => setView(view === 'timeline' ? 'list' : 'timeline')} aria-label="Ganti tampilan">
                {view === 'timeline' ? <List size={18} /> : <SquaresFour size={18} />}
              </button>
              <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Ganti tema">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setLayoutOpen(true)}
                aria-label="Denah warnet"
              >
                <MapTrifold size={18} />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => { setInstant(false); setSettingsOpen(true); }}
                aria-label="Pengaturan"
              >
                <GearSix size={18} />
              </button>
              <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={openQuickAdd}>
                <Plus size={18} weight="bold" /> Booking baru
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Booking aktif', value: String(stats.total), hint: fmtDate(date) },
              { label: 'Sedang main', value: String(stats.inSession), hint: 'PC terisi sekarang' },
              { label: 'Tagihan hari ini', value: fmtRupiah(stats.dayRevenue), hint: 'Estimasi dari durasi' },
              { label: 'Datang 2 jam ke depan', value: String(stats.soon.length), hint: stats.late ? `${stats.late} terlambat` : 'Tepat waktu' },
            ].map((card) => (
              <div key={card.label} className="panel px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{card.label}</div>
                <div key={`${card.label}-${date}`} className="date-swap mt-1 text-xl font-semibold tabular-nums">{card.value}</div>
                <div className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{card.hint}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <div className="min-w-0 flex-1 space-y-4">
              <div key={view} className="view-enter">
              {view === 'timeline' ? (
                <Timeline
                  bookings={timelineBookings.filter((b) => {
                    if (roomFilter !== 'ALL' && b.room !== roomFilter) return false;
                    if (levelFilter !== 'ALL' && b.level !== levelFilter) return false;
                    return true;
                  })}
                  pcs={pcs}
                  date={date}
                  roomFilter={roomFilter}
                  levelFilter={levelFilter}
                  onRoomFilter={setRoomFilter}
                  onLevelFilter={setLevelFilter}
                  loading={loading}
                  arrivals={stats.soon}
                  onSelect={(b) => setSelected(bookings.find((x) => x.id === b.id) ?? b)}
                  onMove={handleMove}
                  onDateChange={setDate}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.length === 0 && !loading && (
                    <div className="panel col-span-full px-5 py-10 text-center">
                      <div className="text-sm font-medium">Belum ada booking di hari ini</div>
                      <p className="mt-1 text-xs" style={{ color: 'var(--color-muted)' }}>Tekan N atau klik Booking baru untuk mencatat booking dari WhatsApp.</p>
                      <button type="button" className="btn btn-primary mt-4" onClick={openQuickAdd}><Plus size={16} /> Tambah booking</button>
                    </div>
                  )}
                  {visible.map((b) => (
                    <button key={b.id} type="button" onClick={() => setSelected(b)} className="panel row-stagger px-4 py-3 text-left" style={{ animationDelay: `${Math.min(8, visible.indexOf(b)) * 35}ms` }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{b.customer_name}</span>
                        <span className="chip !py-0.5">{statusLabel[b.status]}</span>
                      </div>
                      <div className="mt-2 text-sm tabular-nums">{fmtClock(b.start_minute)} – {fmtClock(b.start_minute + b.hours * 60)}</div>
                      <div className="mt-1 flex items-center justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
                        <span>{pcNumbers(b.pc_ids || [b.pc_id])} · {levelLabel(b.level)}{b.quantity > 1 ? ` · ×${b.quantity}` : ''}</span>
                        <span className="tabular-nums">{fmtRupiah(bookingPrice(
                          b.level, b.hours, b.quantity,
                          b.customer_type || 'NON_MEMBER', b.package || 'REGULER',
                        ))}</span>
                      </div>
                      {isLate(b, settings) && <div className="mt-2 text-[11px]" style={{ color: 'var(--color-warn)' }}>LATE &gt;{settings.late_minutes}m</div>}
                    </button>
                  ))}
                </div>
              )}
              </div>
            </div>

            {selected && (
              <DetailPanel
                booking={bookings.find((b) => b.id === selected.id) ?? selected}
                allBookings={bookings}
                settings={settings}
                onClose={() => setSelected(null)}
                onEdit={openEdit}
                onUpdate={(updated) => {
                  setBookings((current) => current.map((b) => (b.id === updated.id ? updated : b)));
                  setSelected(updated);
                  refresh();
                }}
                onToast={pushToast}
              />
            )}
          </div>
        </div>
      </main>

      <QuickAdd
        open={quickAddOpen}
        instant={instant}
        editing={editing}
        onClose={() => setQuickAddOpen(false)}
        date={date}
        pcs={pcs}
        settings={settings}
        onCreated={(saved) => {
          refresh();
          setSelected((current) => (current?.id === saved.id ? saved : current));
          pushToast(editing ? 'Booking diperbarui' : 'Booking tersimpan', 'success', editing ? undefined : saved.id);
        }}
        onError={(message) => pushToast(message, 'error')}
      />
      <SettingsPanel
        open={settingsOpen}
        instant={instant}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaved={setSettings}
        onError={(message) => pushToast(message, 'error')}
      />
      <LayoutModal
        open={layoutOpen}
        onClose={() => setLayoutOpen(false)}
        pcs={pcs}
        usedPcs={usedPcs}
        syncEnabled={settings.occupancy_sync}
        onToggle={toggleUsedPc}
      />
      <ToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((current) => current.filter((t) => t.id !== id))}
        onUndo={async (id) => {
          try {
            await api.cancel(id);
            await refresh();
            setSelected(null);
            pushToast('Booking dibatalkan');
          } catch (error) {
            pushToast((error as Error).message, 'error');
          }
          setToasts((current) => current.filter((t) => t.undoId !== id));
        }}
      />
    </div>
  );
}
