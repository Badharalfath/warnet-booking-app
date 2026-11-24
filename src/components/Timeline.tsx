import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';
import type { Booking, Level, Pc, Room } from '../types';
import { addDays, bookingInterval, fmtClock, fmtDate, isActive, toAbs, todayKey } from '../lib/time';
import { pcNumber, pcSortValue } from '../lib/pcNumbers';

const HOUR_WIDTH = 56;
const DAY_WIDTH = HOUR_WIDTH * 24;
const VISIBLE_DAYS = 7;
const CENTER_DAY = 3;
const RAIL_WIDTH = 122;
const ROW_HEIGHT = 46;

const LEVEL_TINT: Record<string, number> = {
  L1: 13,
  L2: 24,
  L3: 38,
  L3MAX: 56,
};
const LEVEL_ORDER: Level[] = ['L1', 'L2', 'L3', 'L3MAX'];
const ROOM_ORDER: Room[] = ['NON_SMOKE', 'SMOKE'];

const levelLabel = (level: Level) => (level === 'L3MAX' ? 'L3 Max' : level);
const roomLabel = (room: Room) => (room === 'SMOKE' ? 'Smoke' : 'Non-smoke');

interface Props {
  bookings: Booking[];
  pcs: Pc[];
  date: string;
  roomFilter: 'ALL' | Room;
  levelFilter: 'ALL' | Level;
  onRoomFilter: (room: 'ALL' | Room) => void;
  onLevelFilter: (level: 'ALL' | Level) => void;
  loading: boolean;
  arrivals: Booking[];
  onSelect: (booking: Booking) => void;
  onMove: (booking: Booking, date: string, startMinute: number, pcId: string) => Promise<void>;
  onDateChange: (date: string) => void;
}

function blockStyle(level: string, room: string): React.CSSProperties {
  const tint = LEVEL_TINT[level] ?? 20;
  const base = `color-mix(in srgb, var(--color-accent) ${tint}%, var(--color-surface))`;
  const stripe = 'color-mix(in srgb, var(--color-accent) 55%, transparent)';
  return {
    background: base,
    backgroundImage:
      room === 'SMOKE'
        ? `repeating-linear-gradient(45deg, transparent, transparent 5px, ${stripe} 5px, ${stripe} 6px)`
        : undefined,
    color: 'var(--color-ink)',
    border: `1px solid color-mix(in srgb, var(--color-accent) 35%, var(--color-line))`,
  };
}

export default function Timeline({
  bookings,
  pcs,
  date,
  roomFilter,
  levelFilter,
  onRoomFilter,
  onLevelFilter,
  loading,
  arrivals,
  onSelect,
  onMove,
  onDateChange,
}: Props) {
  const rows = useMemo(
    () => pcs.filter((pc) => roomFilter === 'ALL' || pc.room === roomFilter)
      .filter((pc) => levelFilter === 'ALL' || pc.level === levelFilter)
      .sort((a, b) => pcSortValue(a.id) - pcSortValue(b.id)),
    [pcs, roomFilter, levelFilter],
  );
  const groups = useMemo(() => {
    const map = new Map<string, { room: Room; level: Level; pcs: Pc[] }>();
    for (const pc of rows) {
      const key = `${pc.room}|${pc.level}`;
      const group = map.get(key) ?? { room: pc.room, level: pc.level, pcs: [] };
      group.pcs.push(pc);
      map.set(key, group);
    }
    return [...map.values()].sort((a, b) =>
      ROOM_ORDER.indexOf(a.room) - ROOM_ORDER.indexOf(b.room)
      || LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
  }, [rows]);

  const windowDays = useMemo(
    () => Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(date, i - CENTER_DAY)),
    [date],
  );
  const active = useMemo(() => bookings.filter(isActive), [bookings]);
  const stripStartAbs = toAbs(windowDays[0], 0);
  const stripEndAbs = stripStartAbs + VISIBLE_DAYS * 1440;
  const today = todayKey();
  const currentMinute = new Date().getHours() * 60 + new Date().getMinutes();
  const width = RAIL_WIDTH + DAY_WIDTH * VISIBLE_DAYS;
  const hasFilter = roomFilter !== 'ALL' || levelFilter !== 'ALL';

  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingDate = useRef<string | null>(null);
  const previousDate = useRef(date);
  const scrollTimer = useRef<number | null>(null);
  const initialized = useRef(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || loading || rows.length === 0) return;
    if (scrollTimer.current) {
      window.clearTimeout(scrollTimer.current);
      scrollTimer.current = null;
    }
    if (!initialized.current) {
      el.scrollLeft = CENTER_DAY * DAY_WIDTH;
      initialized.current = true;
      previousDate.current = date;
      return;
    }
    if (date === previousDate.current) return;
    // Apply the window shift before paint so the moment under the cursor stays put.
    if (pendingDate.current === date) {
      const shiftDays = (toAbs(date, 0) - toAbs(previousDate.current, 0)) / 1440;
      el.scrollLeft -= shiftDays * DAY_WIDTH;
      pendingDate.current = null;
    } else {
      el.scrollLeft = CENTER_DAY * DAY_WIDTH;
    }
    previousDate.current = date;
  }, [date, loading, rows.length]);

  useEffect(() => () => {
    if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
  }, []);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || !initialized.current || pendingDate.current) return;
    const anchor = el.scrollLeft + (el.clientWidth + RAIL_WIDTH) / 2;
    const index = Math.max(0, Math.min(VISIBLE_DAYS - 1, Math.floor(anchor / DAY_WIDTH)));
    const next = windowDays[index];
    if (next === date) return;
    // Wait for the gesture to settle before changing the date. No scrollLeft jump mid-gesture.
    if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      scrollTimer.current = null;
      if (next === date) return;
      pendingDate.current = next;
      onDateChange(next);
    }, 140);
  }

  const [drag, setDrag] = useState<{
    id: string;
    x: number;
    y: number;
    dateKey: string;
    startMinute: number;
    pcId: string;
  } | null>(null);
  const dragOrigin = useRef<{ x: number; y: number; booking: Booking } | null>(null);
  const movedRef = useRef(false);
  const suppressClick = useRef(false);

  function targetFromPoint(clientX: number, clientY: number, booking: Booking) {
    const pcRows = [...document.querySelectorAll<HTMLElement>('[data-pc-id]')];
    const row = pcRows.find((el) => {
      const rect = el.getBoundingClientRect();
      return clientY >= rect.top && clientY <= rect.bottom;
    });
    const pcId = row?.dataset.pcId;
    if (!pcId) return null;
    const pc = pcs.find((p) => p.id === pcId);
    if (!pc || pc.level !== booking.level || pc.room !== booking.room) return null;
    const area = row!.querySelector<HTMLElement>('[data-time-area]');
    if (!area) return null;
    const rect = area.getBoundingClientRect();
    const offset = clientX - rect.left;
    const dayIndex = Math.max(0, Math.min(VISIBLE_DAYS - 1, Math.floor(offset / DAY_WIDTH)));
    const within = offset - dayIndex * DAY_WIDTH;
    const raw = (within / DAY_WIDTH) * 1440;
    const startMinute = Math.max(0, Math.min(1425, Math.round(raw / 15) * 15));
    return { dateKey: windowDays[dayIndex], pcId, startMinute };
  }

  function blockPointerDown(event: React.PointerEvent<HTMLButtonElement>, booking: Booking) {
    if (event.button !== 0) return;
    dragOrigin.current = { x: event.clientX, y: event.clientY, booking };
    movedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function blockPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const origin = dragOrigin.current;
    if (!origin) return;
    if (!movedRef.current && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < 5) return;
    movedRef.current = true;
    const target = targetFromPoint(event.clientX, event.clientY, origin.booking);
    if (target) setDrag({ id: origin.booking.id, x: event.clientX, y: event.clientY, ...target });
  }

  async function blockPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const origin = dragOrigin.current;
    if (!origin) return;
    dragOrigin.current = null;
    const wasMoved = movedRef.current;
    movedRef.current = false;
    setDrag(null);
    if (!wasMoved) return;
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    const target = targetFromPoint(event.clientX, event.clientY, origin.booking);
    if (!target) return;
    if (target.pcId === origin.booking.pc_id
      && target.dateKey === origin.booking.date
      && target.startMinute === origin.booking.start_minute) return;
    await onMove(origin.booking, target.dateKey, target.startMinute, target.pcId);
  }

  if (loading) {
    return (
      <div className="panel p-4">
        <div className="skeleton mb-4 h-5 w-40 rounded-lg" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="mb-2 flex gap-3">
            <div className="skeleton h-10 w-28 shrink-0 rounded-lg" />
            <div className="skeleton h-10 flex-1 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-schedule className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-4 py-3" style={{ borderColor: 'var(--color-line)' }}>
        <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-muted)' }}>
          TIMELINE · {rows.length} PC
        </span>
        {Object.entries(LEVEL_TINT).map(([level, tint]) => (
          <span key={level} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--color-muted)' }}>
            <span
              className="inline-block h-3 w-5 rounded"
              style={{ background: `color-mix(in srgb, var(--color-accent) ${tint}%, var(--color-surface))`, border: '1px solid var(--color-line)' }}
            />
            {level === 'L3MAX' ? 'L3 Max' : level}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--color-muted)' }}>
          <span
            className="inline-block h-3 w-5 rounded"
            style={{
              background: 'var(--color-accent-wash)',
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, color-mix(in srgb, var(--color-accent) 55%, transparent) 5px, color-mix(in srgb, var(--color-accent) 55%, transparent) 6px)',
              border: '1px solid var(--color-line)',
            }}
          />
          Smoke
        </span>
        <div className="flex w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Next</span>
          <div className="flex w-[190px] items-center" style={{ minHeight: 26 }}>
            {arrivals.length > 0 ? (
              <button
                key={arrivals[0].id}
                type="button"
                className="chip date-swap w-full !justify-start !py-1"
                onClick={() => onSelect(arrivals[0])}
                title={`${arrivals[0].customer_name} · ${pcNumber(arrivals[0].pc_id)}`}
              >
                <span className="shrink-0 font-semibold tabular-nums" style={{ color: 'var(--color-accent-strong)' }}>
                  {fmtClock(arrivals[0].start_minute)}
                </span>
                <span className="min-w-0 flex-1 truncate">{arrivals[0].customer_name}</span>
                <span className="shrink-0 text-[9px] tabular-nums" style={{ color: 'var(--color-muted)' }}>
                  {pcNumber(arrivals[0].pc_id)}{arrivals.length > 1 ? ` · +${arrivals.length - 1}` : ''}
                </span>
              </button>
            ) : (
              <span className="chip w-full !justify-start !py-1 opacity-60">Tidak ada dalam 2 jam</span>
            )}
          </div>
        </div>
      </div>

      {hasFilter && (
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2" style={{ borderColor: 'var(--color-line)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Ditampilkan</span>
          {roomFilter !== 'ALL' && (
            <button type="button" className="chip" onClick={() => onRoomFilter('ALL')}>
              Ruangan: {roomLabel(roomFilter)} <X size={12} />
            </button>
          )}
          {levelFilter !== 'ALL' && (
            <button type="button" className="chip" onClick={() => onLevelFilter('ALL')}>
              Level: {levelLabel(levelFilter)} <X size={12} />
            </button>
          )}
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--color-muted)' }}>
            {rows.length} dari {pcs.length} PC
          </span>
        </div>
      )}

      {rows.length === 0 && (
        <div className="px-4 py-10 text-center">
          <div className="text-sm font-medium">Tidak ada PC untuk filter ini</div>
          <button type="button" className="btn btn-quiet mt-3" onClick={() => { onRoomFilter('ALL'); onLevelFilter('ALL'); }}>
            Hapus filter
          </button>
        </div>
      )}

      {rows.length > 0 && (
        <div ref={scrollRef} onScroll={handleScroll} className="overflow-x-auto">
          <div style={{ width }}>
            <div className="flex sticky top-0 z-10" style={{ background: 'var(--color-surface)' }}>
              <div
                className="shrink-0 border-r px-3 py-2 text-[11px] font-semibold"
                style={{ width: RAIL_WIDTH, borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}
              >
                PC
              </div>
              {windowDays.map((day) => (
                <div
                  key={day}
                  className="relative shrink-0 border-l"
                  style={{ width: DAY_WIDTH, height: 56, borderColor: 'var(--color-line)' }}
                >
                  <div className="flex h-7 items-center gap-2 px-3">
                    <span key={`${day}-${day === date}`} className={`text-[11px] font-semibold${day === date ? ' date-swap' : ''}`}>
                      {fmtDate(day)}
                    </span>
                    {day === today && <span className="chip !py-0 !text-[9px]">Hari ini</span>}
                    {day === date && (
                      <span key={`pick-${date}`} className="date-swap text-[9px]" style={{ color: 'var(--color-accent-strong)' }}>● dipilih</span>
                    )}
                  </div>
                  <div className="relative" style={{ height: 29 }}>
                    {Array.from({ length: 24 }).map((_, h) => (
                      <span
                        key={h}
                        className="absolute top-1.5 text-[10px] tabular-nums"
                        style={{ left: h * HOUR_WIDTH + 4, color: 'var(--color-muted)' }}
                      >
                        {String(h).padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {groups.map((group) => (
              <Fragment key={`${group.room}-${group.level}`}>
                <div className="flex border-t" style={{ height: 28, background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}>
                  <div
                    className="sticky left-0 z-[6] flex shrink-0 items-center gap-2 px-3"
                    style={{ width: 260, background: 'var(--color-panel)', borderRight: '1px solid var(--color-line)' }}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ background: `color-mix(in srgb, var(--color-accent) ${LEVEL_TINT[group.level]}%, var(--color-surface))` }}
                    />
                    <span className="text-[11px] font-semibold">{levelLabel(group.level)}</span>
                    <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
                      {roomLabel(group.room)} · {group.pcs.length} PC
                    </span>
                  </div>
                </div>
                {group.pcs.map((pc) => {
                  const rowIndex = rows.indexOf(pc);
                  const pcBookings = active.filter((b) => (b.pc_ids || [b.pc_id]).includes(pc.id));
                  return (
                    <div key={pc.id} data-pc-id={pc.id} className="flex border-t" style={{ borderColor: 'var(--color-line)', height: ROW_HEIGHT }}>
                      <div
                        className="sticky left-0 z-[5] flex shrink-0 flex-col justify-center border-r px-3"
                        style={{
                          width: RAIL_WIDTH,
                          background: 'var(--color-surface)',
                          borderColor: 'var(--color-line)',
                        }}
                      >
                        <span className="text-[11px] font-semibold tabular-nums">{pcNumber(pc.id)}</span>
                        <span className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
                          {pc.room === 'SMOKE' ? 'smoke' : 'non-smoke'}
                        </span>
                      </div>
                      <div data-time-area className="relative" style={{ width: DAY_WIDTH * VISIBLE_DAYS }}>
                        {windowDays.flatMap((_, dayIndex) => Array.from({ length: 24 }, (__, h) => (
                          <span
                            key={`${dayIndex}-${h}`}
                            className="absolute inset-y-0 border-l"
                            style={{
                              left: dayIndex * DAY_WIDTH + h * HOUR_WIDTH,
                              borderColor: 'var(--color-line)',
                              opacity: h === 0 ? 1 : h % 6 === 0 ? 0.9 : 0.35,
                            }}
                          />
                        )))}

                        {windowDays.map((day, dayIndex) => day === today && (
                          <span
                            key={`now-${day}`}
                            className="now-line absolute inset-y-0 z-[3] w-px"
                            style={{
                              left: dayIndex * DAY_WIDTH + (currentMinute / 1440) * DAY_WIDTH,
                              background: 'var(--color-danger)',
                            }}
                          />
                        ))}

                        {pcBookings.map((b) => {
                          const iv = bookingInterval(b);
                          const start = Math.max(iv.start, stripStartAbs);
                          const end = Math.min(iv.end, stripEndAbs);
                          if (start >= end) return null;
                          const left = ((start - stripStartAbs) / 1440) * DAY_WIDTH;
                          const widthPx = Math.max(3, ((end - start) / 1440) * DAY_WIDTH);
                          const midnights = [];
                          for (let t = Math.ceil(iv.start / 1440) * 1440; t < iv.end; t += 1440) {
                            const x = ((t - stripStartAbs) / 1440) * DAY_WIDTH - left;
                            if (x > 0 && x < widthPx) midnights.push(x);
                          }
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => { if (!suppressClick.current) onSelect(b); }}
                              onPointerDown={(event) => blockPointerDown(event, b)}
                              onPointerMove={blockPointerMove}
                              onPointerUp={blockPointerUp}
                              title={`${b.customer_name}${b.quantity > 1 ? ` · ${b.quantity} PC` : ''} · ${fmtClock(b.start_minute)} – ${fmtClock(b.start_minute + b.hours * 60)} · ${b.hours} jam · ${pcNumber(pc.id)} (${pc.id}) — tarik untuk pindah`}
                              className="booking-block absolute top-1 z-[2] cursor-grab overflow-hidden rounded-lg px-1.5 text-left text-[10px] leading-tight active:cursor-grabbing"
                              style={{
                                ...blockStyle(b.level, b.room),
                                left,
                                width: widthPx,
                                height: ROW_HEIGHT - 8,
                                animationDelay: `${rowIndex * 35}ms`,
                                opacity: drag?.id === b.id ? 0.45 : 1,
                                touchAction: 'none',
                              }}
                            >
                              {midnights.map((x) => (
                                <span
                                  key={x}
                                  className="pointer-events-none absolute inset-y-0 w-px"
                                  style={{
                                    left: x,
                                    background: 'color-mix(in srgb, var(--color-accent) 60%, transparent)',
                                  }}
                                />
                              ))}
                              <span className="relative block truncate font-semibold">
                                {b.customer_name}{b.quantity > 1 ? ` ×${b.quantity}` : ''}
                              </span>
                              {widthPx > 80 && (
                                <span className="relative block truncate tabular-nums" style={{ color: 'var(--color-muted)' }}>
                                  {fmtClock(b.start_minute)} – {fmtClock(b.start_minute + b.hours * 60)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {drag && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg px-2.5 py-1.5 text-xs font-semibold tabular-nums"
          style={{
            left: drag.x + 14,
            top: drag.y + 14,
            background: 'var(--color-ink)',
            color: 'var(--color-surface)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          {fmtClock(drag.startMinute)} · {pcNumber(drag.pcId)}{drag.dateKey !== date ? ` · ${drag.dateKey.slice(5)}` : ''}
        </div>
      )}

      <div className="flex items-center justify-between border-t px-4 py-2 text-[11px]" style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}>
        <span>Geser lintas hari · tanggal berubah otomatis di 00:00 · tarik booking (snap 15 menit)</span>
        <span className="tabular-nums">Sekarang {fmtClock(currentMinute)}</span>
      </div>
    </div>
  );
}
