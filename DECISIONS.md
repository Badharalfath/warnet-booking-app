# Decisions

| # | Decision | Choice | Reason |
|---|----------|--------|--------|
| D1 | Persistence | Backend + SQLite, local | User choice |
| D2 | Start time | Minute-precise (`06:15`) | User choice |
| D3 | Duration / billing | Integer hours × per-level rate | User choice |
| D4 | Day boundary | 24h with rollover | User choice |
| D5 | Conflicts | Block + suggest, force with reason | User choice |
| D6 | Rates | Editable defaults in Settings | User choice |
| D7 | Stack | React + Vite + TS + Tailwind + Express | User choice |
| D8 | Late rule | Flag only at start + 15 min, no auto-cancel | User choice |
| D9 | Cap scope | Per assigned physical PC | User choice |
| D10 | Extend | Included in v1 | User choice |
| D11 | Phone | Required | User choice |
| D12 | SQLite driver | Built-in `node:sqlite` instead of `better-sqlite3` | Node 26 available; no native compile. Verified working. |
| D13 | UI/UX direction | Operate mode; efficiency first; one accent (emerald), Geist/system sans, purposeful 150–250ms motion, Emil Kowalski rules | User asked for extremely UI/UX-centered, efficient, satisfying UI with a hallmark interaction and animation. |
| D14 | Hallmark interaction | Live "now" line with slow pulse + 180ms booking-block entry | Only perpetual animation; conveys live state. |
