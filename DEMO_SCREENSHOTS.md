# Demo screenshots

Captured from the running app with seeded demo data. All files are in `.impeccable/review/demo/`.

Word guide with all 20 screenshots and detailed descriptions: `Warnet_Booking_Planner_Demo_Guide.docx`. Regenerate with `python3 scripts/build_demo_doc.py`.

| # | File | Feature |
|---|------|---------|
| 01 | `01-dashboard-timeline.png` | Day dashboard: stats, arriving strip, grouped timeline, level tints, smoke hatch, now line |
| 02 | `02-filter-buttons.png` | Room and level filter button groups |
| 03 | `03-filtered-schedule.png` | Room filter narrows timeline; removable chips and PC count |
| 04 | `04-custom-datepicker.png` | App-native calendar picker |
| 05 | `05-list-view.png` | List view with status chips, late flags, totals |
| 06 | `06-quick-add-modal.png` | Compact floating booking modal |
| 07 | `07-conflict-warning.png` | Conflict block on add: reason, next free slot, alternatives |
| 08 | `08-booking-detail.png` | Detail panel: status, billing, extend, actions |
| 09 | `09-edit-booking.png` | Edit modal prefilled from an existing booking |
| 10 | `10-edit-conflict.png` | Edit overlap blocked with conflict detail and suggestions |
| 11 | `11-late-flag.png` | LATE >15m flag and "flag only" note |
| 12 | `12-settings-popup.png` | Floating settings pop-up with grouped sections |
| 13 | `13-drag-reschedule.png` | Dragging a booking; snapped target badge (time + PC) |
| 14 | `14-modal-snapped.png` | Booking modal snapped to schedule/viewport edge |
| 15 | `15-toast-undo.png` | Save + move toasts, Undo action |
| 16 | `16-dark-mode.png` | Dark theme |
| 17 | `17-next-day-rollover.png` | Cross-midnight booking shown on next day |
| 18 | `18-mobile.png` | 390px mobile layout |
| 19 | `19-wa-confirmation-copy.png` | WA confirmation copy + toast |
| 20 | `20-empty-day.png` | Empty-day state |
| 21 | `21-seamless-multiday.png` | Continuous three-day timeline with date bands and midnight rollover |
| 22 | `22-inline-next-arrival.png` | Inline NEXT indicator in timeline legend |
| 24 | `24-filter-buttons.png` | Disabled filter combination (L1 selected, Smoke unavailable) |
| 25 | `25-smooth-multiday.png` | Seven-day continuous strip after a smooth date change |
| 26 | `26-continuous-booking.png` | Cross-midnight booking shown as one continuous block |
| 27 | `27-multi-pc-booking.png` | One booking occupying 3 PCs with ×3 badge per block |
| 28 | `28-quantity-form.png` | Jumlah PC stepper in the compact booking modal |
| 29 | `29-member-package-form.png` | Member / non-member and paket options with live price |
| 30 | `30-specific-pc-selection.png` | Manual PC selection in the booking form |
| 31 | `31-floor-layout.png` | Top-down warnet map with clickable used/free marks |
| 32 | `32-occupancy-auto.png` | Occupancy auto-synced from active bookings |

Demo data is currently seeded in `data/warnet.db` and the app is running at `http://localhost:3001`. Delete the DB file to start clean.
