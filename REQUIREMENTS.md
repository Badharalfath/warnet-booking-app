# PRD — Warnet Booking Planner v1

## Problem
Bookings arrive via WhatsApp and are tracked manually. Staff loses track of new bookings, collides on PC slots, and cannot see who is where at a glance.

## Users
Single warnet staff/owner. One local machine or LAN phone. No login needed for v1.

## Goals
1. Add a WA booking in under 30 seconds.
2. See today's PC occupancy at a glance.
3. Never double-book a PC.
4. Bill correctly: integer hours × per-level rate.

## Non-goals (v1)
WA auto-parsing, login/roles, online payment, receipts, analytics, cloud sync.

## Confirmed domain rules
- **Inventory (15 PCs):** L1 non-smoke ×2; L2 non-smoke ×4, L2 smoke ×6; L3 non-smoke ×2; L3 Max non-smoke ×1.
- **Start time:** minute-precise, e.g. `06:15`, `02:05`.
- **Duration:** integer hours, 1–12. End = start + hours × 60 min.
- **Billing:** depends on customer type and package. Reguler uses per-hour rates (non-member 7k/9k/12k/15k by level, member duration table). Packages use fixed prices. Total is then multiplied by Jumlah PC. No rounding of start time. Phone number required.
- **Hours cap:** duration may not run past the next booking on the same assigned PC. If that next booking is cancelled or no-show, the cap lifts and the previous booking may be extended.
- **Late rule:** flag only. If status is `BOOKED` and now > start + 15 min, show `LATE >15m`. No auto-cancel; staff decides.
- **Conflict policy:** block save, explain conflict, suggest alternatives. Force override allowed with a reason.
- **Day boundary:** 24h, bookings may cross midnight. A booking spanning midnight appears on both days.
- **Cap scope:** per assigned physical PC, not per level pool.

## UI/UX direction (v1)
**Mode: Operate.** Efficiency beats expression. Familiar controls, one visual vocabulary, tool disappears into the task. Design read: staff-facing tool used dozens of times per shift, on counter desktop and phone.

**Hallmark interaction:** the live "now" line on the timeline — a thin accent rule with a slow breathing pulse marking current time. It conveys live state; the only perpetual animation. New booking blocks slide ~180ms from their start position into the timeline (state indication). No other ornamental loops.

**Layout**
- Desktop: sticky top bar (date nav, filters, quick-add), left PC rail, timeline canvas, right booking detail panel. Quick-add is a side panel, not a modal.
- Mobile: stacked layout; quick-add is a bottom sheet with velocity-based drag-to-dismiss (~0.11 px/ms).
- Timeline: horizontal scroll, sticky PC column, hour grid, level-colored blocks. Zoom not in v1.
- Keyboard: `N` new, `/` filter, `Esc` close, `←/→` date. Keyboard shortcuts themselves have no press animation; the resulting occasional date change still uses the state-change swap.

**Motion (Emil Kowalski discipline)**
- Purpose required: state change, feedback, loading, reveal. Nothing decorative.
- 150–250ms for occasional UI (panel, toast). 100–160ms press feedback with `scale(0.97)`.
- Custom curves: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`; `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`. Never `ease-in`, `transition: all`, or `scale(0)` entry.
- Transform + opacity only. Popovers originate at trigger; modals stay centered.
- Toasts use CSS transitions, enter from bottom, exit faster than enter.
- Stagger timeline rows 30–50ms on first load only.
- Date changes cross-fade and rise 4px over 220ms (`dateSwap`) on the header pill, KPI values, and selected date label. View switches fade/rise 6px over 180ms.
- Interactive chips and buttons give 140ms press feedback (`scale(0.96)` / `scale(0.97)`); booking blocks lift 1px on hover and scale to 0.98 on press, gated behind `@media (hover: hover)`.
- Scroll itself is never animated. The date updates only after a 140ms scroll-settle debounce, and the compensating window shift happens in `useLayoutEffect` before paint.
- `prefers-reduced-motion`: keep opacity/color, drop position, pulse, and press transforms.

**Type & color**
- One sans family (Geist or system UI). Fixed rem scale, 1.125–1.2 ratio. No display fonts in UI.
- Restrained palette: neutral zinc/slate base, one accent (emerald). Levels = four tints of that accent, not four hues. Smoke = hatch pattern + text label, never color alone.
- Custom app-native controls instead of browser widgets: custom calendar date picker with portaled popover (no `<select>`, no `input[type="date"]`). Filters are always-visible button groups, not dropdowns. Popovers escape modal clipping and close on outside click, Escape, or scroll.
- Every interactive component: default, hover, focus, active, disabled, loading, error. WCAG AA contrast, visible focus rings.
- Dark mode via `prefers-color-scheme` plus manual toggle. No pure black or white.

**Feedback & states**
- Live conflict and price preview before save. Save disabled on conflict; reason inline, not toast.
- Success = toast with Undo. Errors inline beside the field.
- Skeleton timeline while loading; empty-day state teaches how to add the first booking.
- No modal for add/edit. Confirm only for destructive cancel.

## Features

### F1 — Quick add
Compact floating modal, 380px wide, draggable by its header. On release it snaps to the nearest schedule edge or viewport edge ("auto adjusted to the schedule view").
Fields: name*, phone*, date (default today), start (default now rounded to next 5 min), hours (1–12), level, room, notes. Fields sit in a tight 2-column grid so labels and inputs stay close together.
Live pane before save: assigned PC code, end time, total Rp, conflict result.
`*` = required. Enter key submits. Defaults to last used level/room.

### F1b — Jumlah PC
The booking form has a Jumlah PC stepper (1–15) and an optional "Pilih PC tertentu" toggle. One booking can occupy several PCs of the selected level+room at the same date/time. By default the scheduler assigns that many distinct free units; with manual selection the user picks exact PC codes (occupied units disabled) and the scheduler validates only those. Billing multiplies the per-booking price by quantity. Status, cancel, extend, edit and drag apply to the whole booking; drag changes time and keeps the assigned PC set.

### F1c — Price list
Form has a Member / Non-member toggle and a Paket section: Reguler, Pagi (08:00–13:00), Siang (11:00–16:00), Begadang (21:00–06:00). Reguler bills per hour: non-member L1 7k, L2 9k, L3 12k, L3 Max 15k; member uses the duration table (1h 6/8/11/14k through 10h 54/70/90/100k), with unlisted hours priced from the nearest lower listed block plus member hourly top-up. Package prices are fixed: Pagi 25/30/35/40k, Siang 30/35/40/50k, Begadang 40/50/60/75k by level. Selecting a package sets its time window and locks time/duration. Member shows a 5-hour minimum note. Existing scheduling, conflict checks, and drag behaviour are unchanged.

### F2 — Scheduling engine (server-side, authoritative)
- Expand every active booking (status not `CANCELLED`/`NO_SHOW`) into `[start, end)` absolute minute intervals, including spill into the next day.
- Candidate interval `[start, start + hours×60)`. Half-open: 14:00 end and 14:00 start do not clash.
- Find free PCs matching level + room. Assign one deterministically: fewest booked minutes that date, then lowest PC code.
- If none free, return: blocking bookings, next free start for requested hours, free alternatives at requested time (other level/room), and max hours at requested time.
- Expose a dry-run `POST /api/bookings/check` for live form feedback.
- Force override records `forceReason` and shows a red badge.

### F3 — Day dashboard
- Default view = today. Prev/next/today navigation + date picker.
- **Timeline:** PC rows grouped by room → level with sticky category headers showing room, level, and PC count. Continuous seven-day horizontal scroll (three days each side of the selected date) with a date band per day, colored blocks by level, smoke badge, sticky PC column, red "now" line. Cross-midnight bookings render as one continuous block across the day boundary with a thin midnight divider and a full `start – end` label, never as two separate blocks. The date updates 140ms after the scroll gesture settles; the window then shifts by one day in a layout effect before paint so the moment under the cursor never jumps. Header/date-picker navigation re-centres the view.
- **Schedule filters:** room and level are button groups in the header. Active button uses the accent wash; clicking it again clears to Semua. Combinations with zero PCs (for example Smoke + L1) are disabled and faded. Filters narrow the timeline rows, not just the list. Active filters appear as removable chips on the schedule with an "X dari 15 PC" count and an empty-state reset.
- **Drag to reschedule:** booking blocks are draggable to another PC row or start time. Target snaps to a 15-minute grid and to matching level+room rows. Server re-checks conflicts via `PATCH action:move` before saving.
- **List view:** bookings grouped by status and start time.
- Filters: room (all / smoke / non-smoke), level (all / L1 / L2 / L3 / L3 Max), status.
- Upcoming arrivals are shown inline at the right end of the existing timeline legend row: `NEXT 09:00 Nadia · L2-SM-1`, or `Tidak ada dalam 2 jam`. The slot has fixed width, so no extra row, popover, or layout shift when scrolling between days. Clicking the chip opens that booking.

### F4 — Status & late flag
Statuses: `BOOKED` → `CHECKED_IN` → `DONE`; terminal `CANCELLED`, `NO_SHOW`.
`CANCELLED` and `NO_SHOW` free the PC immediately. Late flag is visual only.

### F5 — Extend
Action on `BOOKED`/`CHECKED_IN` bookings while now ≤ end. Opens hours editor. New hours must be > current and ≤ cap from next booking on same PC. Billing updates to new hours × rate. After cancelling the next booking, cap lifts and Extend offers more hours.

### F4b — Denah warnet
A pop-up top-down map based on the supplied whiteboard reference: the outer square is the wall and the small inner rectangles are PC placements. Neutral tile fills with colored 2px borders identify the level (gray L1, blue L2, yellow L3, red L3 Max, green L2 Smoke). Both walls share the same outline size. PC placements are 1:1 squares with tight, even row spacing; only L3 Max is double-height because it occupies more floor space. A crossed outline marks the unused slot (7). Display numbering runs L1 bottom-up 1–2, L2 bottom-up 3–6, crossed slot 7, L3 top-down 8–9, L3 Max 10, then L2 Smoke bottom-up 11–16. A border-color legend labels each level. Each slot is clickable to toggle a simple used/free mark. No hourly input or billing is involved. Used state is persisted in settings as `pc_used` and survives restarts. Admin can toggle `occupancy_sync` in Settings: when on, the map derives used PCs from bookings overlapping the current time (auto mode, tiles read-only); when off, the manual `pc_used` marks are used and tiles are clickable again. The same display numbers are used across the timeline PC rail, manual PC picker, booking detail, list cards, drag badge, and arrival indicator; rows are sorted by that number.

### F5b — Edit existing booking
Detail panel has an Edit action opening the same compact floating modal prefilled with the booking. All fields except status are editable. Conflict check excludes the booking itself and pins the original PC when level/room stay the same. Overlap blocks save with reason, next free slot, alternatives, and force override with reason.

### F6 — Rates & settings
Floating draggable pop-up with grouped sections (rates, rules, WA template), snapping to schedule/viewport edges. Editable per-level hourly rates (placeholders: L1 5000, L2 7000, L3 10000, L3 Max 15000), late grace minutes (15), max hours (12), WA confirmation template. Stored in SQLite.

### F7 — Copy WA confirmation
Button copies Indonesian text with name, date, start, level/room, hours, total, phone, and the 15-minute late note.

## Data model
- `pc(id, code, level, room)`
- `booking(id, customer_name, phone, date, start_minute, hours, level, room, pc_id, status, notes, force_reason, created_at, updated_at)`
- `setting(key, value)`

## API
`GET /api/pcs` · `GET /api/bookings?date=YYYY-MM-DD` · `POST /api/bookings/check` · `POST /api/bookings` · `PATCH /api/bookings/:id` (status or extend) · `DELETE /api/bookings/:id` (sets `CANCELLED`) · `GET/PUT /api/settings`

## Tech
React 18 + Vite + TypeScript + Tailwind; Express + built-in `node:sqlite` (Node 26 here, no native module to compile). Single local server, DB at `data/warnet.db`. Automatic daily and pre-migration snapshots in `data/backups/` (last 30 kept, consistent `VACUUM INTO` copies). Vite proxies `/api` in dev. Built-in `node:sqlite` replaces `better-sqlite3` from the approved stack — same result, fewer dependencies.

## Acceptance criteria
- Adding two overlapping bookings for the only L1 non-smoke PC is blocked with a suggestion.
- Adjacent bookings (one ends 14:00, next starts 14:00) both save.
- `22:00` + 4h renders on today and tomorrow; no conflict with `01:00` tomorrow on the same PC.
- Start `06:15` + 2h ends `08:15`, bills `2 × rate`.
- Next booking on same PC at `15:00`; earlier booking at `13:00` offers max 2 hours.
- Cancel the `15:00` booking; earlier booking now offers up to 12 hours and can extend.
- `BOOKED` at `10:00`, now `10:16` → `LATE >15m` badge; booking still active.
- Cancel/no-show frees the PC for a new booking at the same slot.
- Force override saves and displays its reason.
- Quick-add opens with `N` or one click, is a panel/sheet (never a modal), and has name/phone/date/start/hours prefilled.
- Conflict reason appears inline before save; save is disabled until resolved or force-override reason entered.
- Save gives visible feedback within 100ms; Undo toast appears after success.
- Keyboard-only flow works from open to save; no animation fires on keyboard actions.
- Full component state set present; focus rings visible; AA contrast in light and dark.
- `prefers-reduced-motion` removes pulse and positional motion, keeps opacity/color feedback.

## Assumptions to confirm during build
- 12h default max duration is acceptable.
- Rates above are placeholders, edited in Settings.
- Extension bills the added hours (not free).
- Server binds `0.0.0.0` so a phone on same WiFi can open it; note this means LAN exposure.
