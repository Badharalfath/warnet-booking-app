# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 18 + Vite + TypeScript + Tailwind; Express + built-in `node:sqlite`. User chose the stack. Driver substituted from `better-sqlite3` to `node:sqlite` (logged in `DECISIONS.md`).

## Users

Warnet staff/owner, single operator at the counter. Bookings arrive by WhatsApp and are transcribed manually. May also open the app on a phone over the same WiFi.

## Product Purpose

Capture a WA booking in seconds, show today's PC occupancy at a glance, prevent double-booking, and bill integer hours against a per-level rate.

## Positioning

Server-authoritative per-PC interval scheduling with instant conflict feedback. Staff thinks in PC level and room; the system assigns the physical unit and enforces the next-booking cap.

## Operating Context

15 PCs: L1 non-smoke ×2; L2 non-smoke ×4, L2 smoke ×6; L3 non-smoke ×2; L3 Max non-smoke ×1. Phone number is part of every booking. 15-minute late flag, cancel/no-show releases the PC, extension allowed when the next booking is cancelled.

## Capabilities and Constraints

- Minute-precise start, integer hours 1–12, 24h rollover.
- Conflict = overlap on the assigned PC; half-open intervals; block + suggest; force with reason.
- Bill = hours × per-level rate. Rates editable in Settings.
- Status: BOOKED → CHECKED_IN → DONE, plus CANCELLED / NO_SHOW.
- Local SQLite. No login in v1.

## Brand Commitments

User-stated quality bar: "extremely UI/UX centered, efficient and satisfying to use"; wants a distinctive hallmark interaction and purposeful animation in the Emil Kowalski tradition. No brand name, logo, palette, or typography supplied.

## Evidence on Hand

`REQUIREMENTS.md`, `DECISIONS.md`, `TEST_MATRIX.md`. No screenshots, no real booking data. Rates are placeholders.

## Product Principles

1. One glance gives occupancy truth.
2. Fastest path from WA message to valid booking.
3. Server decides conflicts; UI explains them.
4. Motion conveys state, never decoration.
5. Familiar controls beat novelty.

## Accessibility & Inclusion

Keyboard-first quick-add, visible focus, WCAG AA contrast, `prefers-reduced-motion`, usable touch targets on phone. (Inferred from the operating context, not explicitly requested.)
