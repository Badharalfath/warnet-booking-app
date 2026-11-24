# Implementation Plan

1. Scaffold project: Vite React TS, Tailwind, Express entry, `data/warnet.db`, dev proxy.
2. Backend first. Schema + seed 15 PCs + settings. Pure scheduling module with no Express dependency so it is unit-testable.
3. API routes use the scheduling module; all validation server-side.
4. Frontend: shared types, API client, then Quick-add, then Dashboard, then Status/Extend, then Settings.
5. Tests: Vitest for scheduling edge cases (overlap, midnight, cap, extension, billing). API smoke via HTTP.
6. Run dev servers, verify in browser, record evidence.

Order rationale: scheduling correctness is the risk. Build and test it before UI.
