
# Conventions

- CSS custom properties: `--yellow`, `--blue`, `--blue-300`, `--text-blue`, `--bg`,
  `--text`. Fluid sizing throughout via `clamp(mobile-min, Xvw, desktop-max)` with
  1920px as the design reference width (documented in CLAUDE.md).
- Machine popup (`.mpop-*` classes in style.css) uses a `--u` custom-property scaling
  convention distinct from the clamp() pattern used elsewhere — see
  `mem:figma-machine-popup` for the Figma source node and inferred-content caveat.
- Booking flow CSS/JS is namespaced with a `bk`/`bk-` prefix (`bkState`, `bkRenderCalendar`,
  `.bk-view`, `.bk-page`) to keep it independent from the `mpop-`/main-page namespace.
- Data-driven rendering: machine content lives in JS object literals — `machineDetailData`
  and `machineTrainingData` in main.js, `bkMachineData` in booking.js — keyed by machine
  slug (matches the `id` on each `<section class="machine-section">`). Adding/editing a
  machine means editing these data objects, not hand-writing new HTML/JS per machine.
- No comments-heavy style; keep additions consistent with the terse existing code.
