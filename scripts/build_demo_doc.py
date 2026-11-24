"""Build the Word demo guide from the captured screenshots."""

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / ".impeccable" / "review" / "demo"
OUT = ROOT / "Warnet_Booking_Planner_Demo_Guide.docx"

FEATURES = [
    (
        "01-dashboard-timeline",
        "Day dashboard and grouped timeline",
        [
            "The default landing view for the selected date, Sabtu 21 November 2026. The header holds the date navigator (previous day, date picker, next day), search, room and level filters, view toggle, theme toggle, settings and the primary Booking baru button.",
            "Four summary cards report 2 active bookings, 0 PCs currently in session, an estimated Rp 61.000 in billable value, and 1 arrival within the next two hours. The hint '1 terlambat' flags a booking past the 15-minute late threshold.",
            "Upcoming arrivals are not given a separate strip. The timeline legend row ends with a fixed-width NEXT slot (feature 22), so the page height stays identical when scrolling between days.",
            "The timeline lists all 15 PCs, grouped into sticky category headers by room then level (L1 Non-smoke 2 PC, L2 Non-smoke 4 PC, L3 Non-smoke 2 PC, L3 Max 1 PC, L2 Smoke 6 PC). The legend maps four level tints of the single emerald accent plus a hatch pattern for smoke.",
            "Booking blocks show the customer name and start time. The thin red 'now' line marks the current time at roughly 16:35. Rani's 22:00 booking at the far right runs past midnight and will also appear on the next day. The grid scrolls horizontally; the PC rail stays pinned.",
        ],
    ),
    (
        "02-filter-buttons",
        "Room and level filter buttons",
        [
            "The two filter dropdowns are replaced by always-visible button groups: RUANGAN with Semua / Non-smoke / Smoke, and LEVEL with Semua / L1 / L2 / L3 / L3 Max. The active button is filled with the accent wash and an accent border; clicking it again returns to Semua.",
            "Options that would display no PC are disabled and faded to 35% opacity with a not-allowed cursor and an explanatory title. Because only L2 has smoking PCs, selecting Smoke disables L1, L3 and L3 Max. Selecting L1 disables Smoke.",
            "The groups sit in the header beside search and stay visible on mobile without overflowing. They filter both the timeline rows and the list view, and the same state is reflected in the removable chips on the schedule.",
        ],
    ),
    (
        "03-filtered-schedule",
        "Schedule filtering by room and level",
        [
            "With Smoke selected, the timeline is reduced from 15 PCs to the 6 smoking PCs. Only the L2 Smoke group and rows L2-SM-1 through L2-SM-6 remain; non-smoke rows disappear entirely.",
            "A 'DITAMPILKAN' bar appears directly under the legend, showing a removable 'Ruangan: Smoke ×' chip and the count '6 dari 15 PC'. Level filters behave the same way and both filters combine.",
            "An empty state with a 'Hapus filter' reset button appears if a combination matches no PC. Filtering changes the schedule itself, not just the list view.",
        ],
    ),
    (
        "04-custom-datepicker",
        "App-native calendar picker",
        [
            "The date field is a custom month grid instead of the browser date input. The trigger renders the long Indonesian date (for example 'Sab, 21 Nov 2026') with a calendar icon.",
            "The popover shows the month and year, previous/next month arrows, weekday headers starting Senin, and a six-week day grid. The selected day is filled with the accent colour; today uses a lighter accent wash. Days outside the current month are dimmed.",
            "A 'Hari ini' shortcut jumps back to today. Like the dropdown, the calendar is portaled to the body so it can open above the floating booking modal without being clipped.",
        ],
    ),
    (
        "05-list-view",
        "Compact list view",
        [
            "The view toggle swaps the timeline for a responsive card grid. Each card shows the customer name, a status chip (Dipesan or Main), the start and end time, the PC code, the level, and the computed rupiah total.",
            "Amber LATE >15m labels mark bookings whose check-in window has passed. Rani's card reads 22:00 – 02:00, demonstrating that a booking crossing midnight is shown as one continuous interval.",
            "This view is useful when staff care about who is booked rather than which physical PC is free. The same room, level and search filters still apply.",
        ],
    ),
    (
        "06-quick-add-modal",
        "Compact floating booking modal",
        [
            "The quick-add form is a 380-pixel floating modal over a dimmed backdrop, not a side panel. Its header has a drag handle, the title 'Booking baru', a hint that it can be dragged and snapped, and a close button.",
            "Fields sit in a tight two-column grid: name spans the full width, then phone and date, then minute-precise start time and duration with −/+ steppers. Level and room become compact chip rows, followed by a two-line notes field.",
            "The live availability pane and the override checkbox sit just above the sticky footer. The footer shows the estimated bill (hours × level rate) and the single primary action. On open, focus goes straight to the name field; defaults are today, the next rounded time, and the last used PC type.",
        ],
    ),
    (
        "07-conflict-warning",
        "Conflict blocking on add",
        [
            "A second L3 Max booking at 14:00 cannot be saved because Sinta already occupies L3MAX-NS-1 from 14:00 to 17:00. The form does not allow the double booking.",
            "A red 'Bentrok:' panel names the blocking booking with its time, duration and PC. Below it, 'Kosong pertama: 17:00' is a one-click suggestion that moves the start time to the first free slot.",
            "Alternative types with free capacity are offered as chips (L1, L2, L3 Max variations), so staff can switch PC type without leaving the form. The save button is disabled until the conflict is resolved or a force reason is supplied. The estimate remains visible throughout.",
        ],
    ),
    (
        "08-booking-detail",
        "Booking detail and status actions",
        [
            "Selecting a booking block opens a detail panel on the right. It shows the customer name and phone, status chips, the assigned PC, the full date and time range, level/room, duration and the rupiah bill with its rate breakdown.",
            "The 'Booking berikutnya di PC ini' line explains the hours cap: the next reservation on the same physical PC limits how far this one can be extended.",
            "The 'Perpanjang durasi' input accepts a longer duration up to that cap; the button stays disabled for invalid values. The footer holds the primary workflow actions — copy WA text, check-in or mark done, plus no-show and cancel — and the LATE flag when applicable.",
        ],
    ),
    (
        "09-edit-booking",
        "Editing an existing booking",
        [
            "The Edit booking button in the detail panel opens the same compact floating modal, now titled 'Edit booking' and subtitled with the customer name and current PC.",
            "Every field except status is prefilled from the stored booking: name, phone, date, minute-precise start, integer hours, level, room and notes. The footer action reads 'Simpan perubahan' instead of 'Simpan booking'.",
            "Because this is the same component, the live conflict check, price estimate, custom date picker, snapping and drag behaviour all work identically in add and edit mode.",
        ],
    ),
    (
        "10-edit-conflict",
        "Overlap limit while editing",
        [
            "Farhan's booking on L1-NS-2 is being moved from 16:00 to 15:00. That would overlap Yudi, who already holds L1-NS-2 from 14:00 to 16:00, so the edit is blocked.",
            "The conflict panel names Yudi with the exact overlapping interval and PC, offers 16:00 as the first free start, and lists alternatives on other types (L2 Non-smoke, L2 Smoke, L3 Non-smoke) with their free counts.",
            "The save button is disabled with the helper line 'Atasi bentrok atau centang paksa simpan.' The detail panel behind the modal still shows Farhan's original data, so the user can compare before deciding. Force override is available only after typing a reason.",
        ],
    ),
    (
        "11-late-flag",
        "Late check-in flag",
        [
            "Dewi's 16:00 booking is past the 15-minute grace period at the captured time of 16:37. An amber 'LATE >15m' chip appears next to the status and PC chips in the detail panel.",
            "The bottom note states 'Lewat batas 15 menit. Flag saja — tidak auto-batal.' The booking stays active: check-in, no-show and cancel remain available. This preserves the agreed rule that the system warns but staff decides.",
            "The same amber flag appears on timeline and list cards, so overdue bookings are visible without opening the detail panel.",
        ],
    ),
    (
        "12-settings-popup",
        "Floating settings pop-up",
        [
            "Settings are now a draggable floating pop-up rather than a side sheet. The 420-pixel modal has the same drag handle, snap-to-edge behaviour, dimmed backdrop and 180 ms entry transition as the booking modal.",
            "Content is grouped into three labelled sections. 'TARIF PER JAM' holds four rate cards (L1 5000, L2 7000, L3 10000, L3 Max 15000), each with a live rupiah-per-hour preview.",
            "'ATURAN BOOKING' holds the 15-minute late grace and 12-hour maximum, with helper text explaining that late is flag-only and that the maximum applies to a single booking. 'PESAN WHATSAPP' contains the editable confirmation template and its variable list.",
        ],
    ),
    (
        "13-drag-reschedule",
        "Drag and drop rescheduling with snapping",
        [
            "A booking block is being dragged from its original slot to a later time on the same PC row. The source block is dimmed while the pointer is held.",
            "A dark badge follows the cursor and reads the snapped target: '19:30 · L3-NS-1'. Times snap to a 15-minute grid, and the target row is restricted to PCs matching the booking's level and room.",
            "On release, the server re-runs the conflict check before saving. A rejected move leaves the original booking untouched and shows an error toast; a successful move updates the grid and shows a confirmation toast.",
        ],
    ),
    (
        "14-modal-snapped",
        "Floating modal snapped to the schedule",
        [
            "The booking modal was dragged from the centre of the screen to the left edge. It now sits just inside the viewport, aligned with the schedule panel rather than overlapping the middle of the timeline.",
            "Snapping considers the viewport edges and the schedule panel's left, right, top and bottom edges, within a 110-pixel threshold. This is the 'auto adjusted to the schedule view' behaviour.",
            "The modal keeps its compact two-column layout at any position. A tooltip from the previous drag action is still visible at the bottom right, and the start field is showing the live 'Mengecek…' state.",
        ],
    ),
    (
        "15-toast-undo",
        "Feedback toasts with Undo",
        [
            "Two stacked toasts confirm the two write actions in sequence: 'Dipindah ke 19:30 · L3-NS-1' for the drag, and 'Booking tersimpan' for the new booking, the latter with an Undo button.",
            "The timeline behind the toasts reflects both changes: Agus now occupies 19:30 on L3-NS-1 and DemoToast occupies 20:00 on L3MAX-NS-1. The active booking count rises from 7 to 8 and the daily estimate from Rp 158.000 to Rp 188.000.",
            "Toasts use CSS transitions, enter from the bottom, and disappear after five seconds. Undo cancels only the booking it belongs to.",
        ],
    ),
    (
        "16-dark-mode",
        "Dark theme",
        [
            "The same dashboard in dark mode: off-black and charcoal surfaces, low-contrast grid lines, light text and the same emerald accent. Pure black and pure white are avoided to preserve depth.",
            "Level tints, smoke hatching, the red now line, status chips and toasts all remain readable. The theme toggle in the header switches between light and dark and stores the choice locally; system preference is used on first load.",
            "Motion and colour behaviour are unchanged between themes, and focus rings remain visible for keyboard users.",
        ],
    ),
    (
        "17-next-day-rollover",
        "Cross-midnight bookings on the next day",
        [
            "The date navigator has moved to Minggu 22 November 2026, and a 'Hari ini' button appears to jump back. The now line is absent because this is not today.",
            "Rani's booking started at 22:00 on 21 November and runs for four hours. Its 00:00–02:00 segment is drawn on L3-NS-2 on this day, so staff see the overnight occupancy without re-reading the previous day.",
            "Nadia's 09:00 three-hour booking appears on L2-SM-1 with smoke hatching. The stats show 2 active bookings and Rp 61.000 for this date.",
        ],
    ),
    (
        "18-mobile",
        "Mobile layout at 390 px",
        [
            "At a 390-pixel viewport the header wraps into distinct rows: branding, date navigation with arrows, two side-by-side filter dropdowns, an icon row, and a full-width Booking baru button. Nothing overflows horizontally.",
            "The four KPI cards become a two-column grid. The timeline keeps its sticky PC rail and scrolls horizontally inside its panel, with grouped room/level headers still visible.",
            "The same floating modal becomes full-width on a phone, so the compact field layout stays usable with touch input. Dark mode and all filters work at this size.",
        ],
    ),
    (
        "19-wa-confirmation-copy",
        "WhatsApp confirmation copy",
        [
            "The detail panel for Sinta is open. It shows the bill of Rp 45.000, the note that the next booking on the same PC is DemoToast at 20:00, and therefore an extend maximum of 6 hours rather than the global 12.",
            "Clicking 'Salin teks WhatsApp' fills the clipboard with the template rendered for this booking: name, date, start and end time, level, room, hours, total and phone, plus the 15-minute late reminder.",
            "A green 'Teks WhatsApp disalin' toast confirms the copy. The timeline behind the panel is scrolled to the right, with a visible horizontal scrollbar, showing late-day bookings.",
        ],
    ),
    (
        "20-empty-day",
        "Empty-day state",
        [
            "Senin 23 November 2026 has no bookings. All four KPI cards read zero, and the date-pill arrival badge is empty.",
            "The timeline still renders all 15 PCs in their grouped room/level sections, so staff can see the available inventory at a glance. No booking blocks and no now line are drawn because this is a future date.",
            "Booking for this day starts with the same one-click flow: the primary button or the N shortcut opens the prefilled modal with this date already selected.",
        ],
    ),
    (
        "21-seamless-multiday",
        "Seamless multi-day horizontal scroll",
        [
            "The timeline is a continuous seven-day strip: three days before and three days after the selected date share one time axis. A date band above the hour labels names each day, marks today, and indicates which day is selected.",
            "On load the view is centred on the selected day. Scrolling changes the selected date only after the gesture settles for 140ms, then the seven-day window shifts by one day in a layout effect before paint. The moment under the cursor therefore never jumps mid-gesture. Scrolling left walks back through previous days in the same way.",
            "Cross-midnight bookings are drawn as one continuous block spanning the day boundary, with a thin divider at midnight and a full start–end label; Rani's 22:30–02:30 booking no longer appears as two separate blocks. No loading skeleton flashes during the date change; header date navigation simply re-centres the strip.",
            "Dragging a booking now targets a day column as well as a PC row, so a reservation can be moved into the adjacent day with the same 15-minute snapping and server-side conflict check.",
        ],
    ),
    (
        "22-inline-next-arrival",
        "Inline NEXT indicator in the timeline legend",
        [
            "The former full-width 'AKAN DATANG' strip and the date-pill popover are both gone. Upcoming bookings now live at the right end of the timeline legend row, which already exists for the level and smoke swatches. No extra row is added, so scrolling between days never changes the page height.",
            "Here the selected day is Minggu 22 November 2026 and one booking starts within the next two hours. The fixed-width slot reads 'NEXT 09:00 Nadia L2-SM-1'; clicking it opens that booking's detail panel. With several arrivals it shows the first one plus '+n', keeping the same slot width.",
            "On a day with no upcoming arrivals the same slot reads 'Tidak ada dalam 2 jam' in a muted chip. Because the indicator shares the legend row, it stays visible while the timeline scrolls horizontally and never covers the grid or a modal.",
        ],
    ),
    (
        "24-filter-buttons",
        "Disabled filter combinations",
        [
            "A follow-up to feature 2, this capture shows the disabled state after selecting L1. The Smoke button in the RUANGAN group is faded and cannot be clicked, because the inventory has no L1 smoking PCs.",
            "The active L1 button uses the accent wash and border; Semua in the RUANGAN group is active because no room restriction is applied. The timeline therefore shows 2 PCs, and the DITAMPILKAN bar reports '2 dari 15 PC'.",
            "Disabling is computed from the current inventory and the other filter, so impossible combinations are never offered. Clicking the same active button again clears that filter back to Semua.",
        ],
    ),
    (
        "25-smooth-multiday",
        "Smooth date changes and purposeful motion",
        [
            "The seven-day strip keeps several days in view, so ordinary scrolling never needs a content swap mid-gesture. The date pill, KPI values and selected date label cross-fade and rise 4px over 220ms with a custom ease-out curve when the date changes.",
            "View switches fade and rise 6px over 180ms. Buttons and filter chips give 140ms press feedback; booking blocks lift 1px on hover and scale to 0.98 on press, with hover effects gated to fine pointers.",
            "Scroll itself is never animated. After the gesture settles the window shift is applied before paint, so the change reads as a smooth date transition rather than a stutter. Reduced-motion users keep opacity and colour feedback but lose positional movement.",
        ],
    ),
    (
        "26-continuous-booking",
        "One block for a cross-midnight booking",
        [
            "The split-block bug is fixed. Instead of rendering one segment per day, each booking is drawn once across the continuous seven-day time axis. Rani's 22:30 start plus four hours appears as a single 224-pixel block on L3-NS-2.",
            "The label shows the full range '22:30 – 02:30' rather than repeating the start time on both halves. A thin accent divider inside the block marks the midnight crossing, so staff can see the rollover without mistaking it for two reservations.",
            "Conflict checks, dragging, and billing still use the original stored start time and integer hours; only the rendering changed. Clamped blocks at the left or right edge of the visible window are shortened to the window boundary.",
        ],
    ),
    (
        "27-multi-pc-booking",
        "Jumlah PC — one booking, several PCs",
        [
            "A booking can now reserve several PCs of the same level and room in one step. Here a single customer booking at 14:00 for two hours occupies L2-SM-1, L2-SM-2 and L2-SM-3. The timeline shows three linked blocks, each labelled 'Multi ×3' so staff can see they belong to one reservation.",
            "The detail panel lists all assigned PCs, shows a '×3 PC' chip, and bills Rp 42.000 calculated as 2 hours × Rp 7.000 × 3 PCs. Check-in, no-show, cancel, extend, edit and drag all act on the whole booking; dragging changes the time and keeps the same three PCs.",
            "The scheduler only assigns a booking when that many distinct free PCs exist. Asking for four PCs while three are already taken is rejected with the usual conflict detail and alternatives.",
        ],
    ),
    (
        "28-quantity-form",
        "Jumlah PC stepper in the booking form",
        [
            "The compact floating modal now has a Jumlah PC stepper beside Durasi, keeping the form dense and avoiding a separate field lower down. It accepts 1 to 15 and defaults to 1, so existing single-PC booking behaviour is unchanged.",
            "The live availability pane lists every assigned PC code once the quantity is set. The estimate at the footer multiplies the per-PC total by the quantity, so the price updates immediately as the stepper changes.",
            "In edit mode the field is prefilled from the stored booking. Reducing or increasing it reassigns PCs through the same conflict check; if the level and room stay the same and the new quantity fits the existing assignment, those PCs are kept.",
        ],
    ),
]


def add_image(doc: Document, filename: str):
    path = SHOTS / f"{filename}.png"
    if not path.exists():
        raise FileNotFoundError(path)
    width = Inches(2.7) if filename.startswith("18-") else Inches(6.3)
    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.add_run().add_picture(str(path), width=width)
    caption = doc.add_paragraph()
    caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = caption.add_run(f"Figure {filename[:2]} — {SHOTS.name}/{filename}.png")
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(110, 120, 128)


def build():
    doc = Document()
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(10.5)
    normal.paragraph_format.space_after = Pt(6)

    title = doc.add_heading("Warnet Booking Planner", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run("Feature demo guide — 20 screenshots with detailed descriptions")
    run.font.size = Pt(13)
    run.font.color.rgb = RGBColor(80, 95, 105)

    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta.add_run("Local web app · React + Vite + Express + SQLite · Captured 21 November 2026").italic = True

    doc.add_heading("How to read this guide", level=1)
    for text in [
        "Each section pairs one screenshot with a description of what is visible and why the screen exists. Screenshots were captured from the running app with seeded demo data, so names, times and totals are illustrative rather than real bookings.",
        "The app is reached at http://localhost:3001. The server binds 0.0.0.0, so a phone on the same WiFi can open it via the machine's LAN IP. Data lives in data/warnet.db; deleting that file restores the empty seeded state.",
        "Keyboard shortcuts: N opens a new booking, / focuses search, Escape closes a panel, and the left/right arrows change day.",
    ]:
        doc.add_paragraph(text, style="List Bullet")

    doc.add_page_break()

    for index, (filename, heading, paragraphs) in enumerate(FEATURES, start=1):
        h = doc.add_heading(f"{index:02d}. {heading}", level=1)
        h.paragraph_format.keep_with_next = True
        for text in paragraphs:
            doc.add_paragraph(text)
        add_image(doc, filename)
        if index % 4 == 0 and index != len(FEATURES):
            doc.add_page_break()

    doc.add_heading("Appendix — rules enforced by the app", level=1)
    for text in [
        "Inventory: L1 non-smoke ×2, L2 non-smoke ×4, L2 smoke ×6, L3 non-smoke ×2, L3 Max non-smoke ×1.",
        "Start times are minute-precise; duration and billing are whole hours. Total equals hours multiplied by the level's hourly rate.",
        "Overlap is evaluated per physical PC with half-open intervals, so one booking ending at 14:00 and another starting at 14:00 do not clash.",
        "A booking cannot run past the next reservation on the same PC. Cancelling or marking the next booking no-show lifts that cap and allows extension.",
        "Beyond 15 minutes late is a visual flag only. Staff decides whether to check in, mark no-show, or cancel.",
        "Cancelled and no-show bookings free the PC immediately. Bookings crossing midnight appear on both dates.",
    ]:
        doc.add_paragraph(text, style="List Bullet")

    doc.save(OUT)
    print(OUT)


if __name__ == "__main__":
    build()
