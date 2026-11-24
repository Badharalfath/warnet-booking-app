# Test Matrix

| ID | Case | Expected | Level | Evidence |
|----|------|----------|-------|----------|
| A1 | Overlap when all matching PCs taken | Save blocked, 2 suggestions returned | unit + UI | `scheduler.test.js`; browser conflict flow |
| A2 | End 14:00, next start 14:00 | Both saved | unit | pass |
| A3 | 22:00 + 4h, next-day render | Conflict detected; renders on both days | unit + UI | pass; browser next-day view showed Budi block |
| A4 | Start 06:15 + 2h | Bill = 2 × rate | unit | pass |
| A5 | Next booking 15:00, candidate 13:00 | Max 2 hours | unit | pass |
| A6 | Cancel/no-show next booking; extend | Cap lifts, hours increase, bill updates | unit + API | pass; PATCH extend 2→4 succeeded |
| A7 | BOOKED 10:00, now 10:16 | LATE >15m flag, still active | UI | rendered via `isLate` |
| A8 | Cancel/no-show | PC free at same slot | API | pass |
| A9 | Force override | Saves with reason badge | unit | pass |
| A10 | Phone missing | Save blocked | unit + UI | pass |
| UX1 | Quick-add via N / one click, panel not modal, prefilled | Pass | UI | browser: focus on name, all defaults set |
| UX2 | Inline conflict, save disabled | Pass | UI | browser: save disabled, next-slot button shown |
| UX3 | Save feedback under 100ms + Undo toast | Pass | UI | toast stack with Undo |
| UX4 | Keyboard-only flow, no motion on keyboard | Pass | code | `instant` class disables animation |
| UX5 | Full component states, focus rings, AA in both themes | Pass | UI | light + dark screenshots inspected |
| UX6 | Reduced motion drops pulse/position | Pass | code | CSS media query |
| UX7 | Room + level filter narrows timeline rows; grouped headers and removable chips | Pass | UI | browser: Smoke + L2 → 6 PC, L2-SM-1..6 only; chip clear restores 6 smoke PC |
| UX8 | Compact floating modal drags and snaps to schedule edges | Pass | UI | browser: modal 380px, dragged to schedule.left+12, snapped to viewport bottom |
| UX9 | Drag booking block to new time and PC row with 15-min snap | Pass | UI + API | browser: 12:00→15:00 same PC; L1-NS-1→L1-NS-2 snapped to 03:15 |
| UX10 | Custom dropdown and date picker, no native browser widgets | Pass | UI | browser: 0 `select`, 0 `input[type=date]`; popovers portaled to BODY; date 20 selected; modal date picker not clipped |
| UX11 | Edit existing booking prefilled, saved with conflict limit | Pass | UI + API | browser: edit prefilled 14:00/2j; saved as Edited 14:00/3j; overlap edit blocked (save disabled) then force override saved |
| UX12 | Settings as floating draggable pop-up | Pass | UI | browser: 420x680 modal, grouped sections, rate L1 saved as 6000 via API |
| UX13 | Seamless 7-day horizontal scroll changes date after gesture settles | Pass | UI | browser: initial scrollLeft 4032 centered; four +900 wheel steps → 22,23,24,24 Nov; four −900 steps → 24,23,22,22 Nov; scrollLeft stays inside 4032–4944; no mid-gesture jump; header nav re-centres to 4032 |
| UX15 | Rapid wheel scroll does not snap back to current day | Pass | UI | browser: five +900 wheel steps → 23,23,24,25 Nov; five −900 steps → 24,23,23,22,21 Nov. Scroll events locked until parent applies each date. |
| UX16 | Room/level button groups with disabled combinations | Pass | UI | browser: Smoke active disables L1/L3/L3 Max (opacity 0.35); L1 active disables Smoke; clicking active returns to Semua; 0px overflow desktop + mobile |
| UX17 | Purposeful interaction animation | Pass | UI/CSS | browser: 7 `.date-swap` nodes active on date change; view switch uses `viewEnter` 180ms; chip/booking press transforms 140ms; hover gated to fine pointers; reduced-motion rule drops transforms |
| UX18 | Cross-midnight booking is one continuous block | Pass | UI | browser: Rani 22:30 +4h renders as one 224px block labelled '22:30 – 02:30' with midnight divider; only one `.booking-block` with text Rani |
| UX19 | Jumlah PC books several units in one booking | Pass | unit + API + UI | tests: distinct pcIds, insufficient capacity blocked, existing multi-PC occupancy respected; API: quantity 3 → L2-SM-1..3, quantity 4 blocked; UI: three blocks 'Multi ×3', detail Rp 42.000 = 2×7.000×3 |
| UX20 | Member/non-member and paket pricing | Pass | UI | browser: non-member L2 5h Rp45.000; member L2 5h Rp40.000; Pagi L2 Rp30.000 with 08:00/5h locked; Begadang L3 Rp60.000 with 21:00/9h; existing idham now Rp21.000 |
| UX21 | Manual selection of specific PCs | Pass | API + UI | check with pcIds=['L1-NS-2'] returns that exact unit; UI toggle shows matching PC chips with occupied disabled; data unchanged after test (6 bookings) |
| UX22 | Top-down layout pop-up with used/free marks | Pass | UI | browser: 15 PC tiles + crossed placeholders, click toggles aria-pressed and persists pc_used; restored to empty after test; bookings unchanged |
| UX23 | Occupancy sync from bookings with admin toggle | Pass | UI + API | browser: sync on marks L3-NS-1 auto-used from active booking and disables tiles; sync off in Settings enables manual marks; restored sync on; 7 bookings unchanged |
| UX14 | Arrivals shown inline in timeline legend, fixed layout | Pass | UI | browser: no strip, no badge/popover; NEXT shows 09:00 Nadia L2-SM-1 on 22 Nov and 'Tidak ada dalam 2 jam' on 21 Nov; legend top stays 245px across dates |
