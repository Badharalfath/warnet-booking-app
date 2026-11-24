# Warnet Booking Planner

Local web app for WhatsApp bookings. One screen shows PC occupancy, billing, and status.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173` while developing. This runs two watchers:

- API on port 3001 with `node --watch` — backend edits restart it automatically.
- Vite on port 5173 — frontend edits hot-reload in the browser. Vite proxies `/api` to port 3001.

Run this in **your own terminal**, not as an agent background task. Agent-started processes stop when the assistant session restarts, which is what causes "Failed to fetch". Keep the terminal open while using the app.

For a single production-style process:

```bash
npm run build
npm start
```

Open `http://localhost:3001`. The server binds `0.0.0.0`, so a phone on the same WiFi can use the LAN IP.

Data lives in `data/warnet.db`, created and seeded on first run. Delete that file only when you intentionally want a clean slate.

Backups are automatic:
- One daily snapshot at `data/backups/warnet-YYYY-MM-DD.db`, created on the first server start of the day.
- An extra snapshot before any schema migration, so a code update cannot destroy old data.
- The last 30 snapshots are kept. Each uses SQLite `VACUUM INTO`, so it is a consistent copy.

## Pricing

Choose **Member** or **Non-member**, then **Reguler** or a package: Pagi (08:00–13:00), Siang (11:00–16:00), Begadang (21:00–06:00). Reguler bills per hour; packages use fixed prices. Selecting a package sets the time window and locks time/duration. The total is multiplied by Jumlah PC.

## Multiple PCs

Set **Jumlah PC** in the booking form to reserve several PCs of the same level/room at once. Enable **Pilih PC tertentu** to choose exact units instead of auto-assignment; occupied units are disabled. One action changes status, cancels, extends, edits, or moves every PC in that booking.

## Layout map

The map button in the header opens a top-down pop-up of both floors. Admin can choose in Settings:

- **Sinkron okupansi dari booking** on: PCs with a booking overlapping the current time are marked used automatically; map tiles are read-only.
- Off: click a PC to mark it used or free. Manual marks are saved in settings and survive restarts.

No time or billing input is involved in either mode.

## Keys

`N` new booking · `/` search · `Esc` close panel · `←/→` change day.

Drag the booking modal by its header; it snaps to schedule/viewport edges. Drag a booking block to another PC row, time, or adjacent day; it snaps to 15 minutes and rechecks conflicts. The timeline scrolls seamlessly across seven days: the date updates 140ms after the gesture settles, and the window shift happens before paint so the view never jumps. Date changes, view switches, chips, and booking blocks use short purpose-driven transitions; `prefers-reduced-motion` removes the movement.

## Docs

`REQUIREMENTS.md` (PRD + UI/UX spec), `PRODUCT.md`, `DECISIONS.md`, `TEST_MATRIX.md`.
