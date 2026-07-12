
# Project: icwebsite

Static single-page marketing/booking site for a machine-rental (3D printer, laser cutter,
UV printer, 3D scanner) service. No build system, no bundler, no package manager.

## Source map (5 hand-written files, ~4900 lines total)

- `index.html` (846 lines) — hero, machine-type tab nav (`#machines`), one
  `<section class="machine-section" id="printer|laser|uv|scanner">` per machine type,
  training modal (`#training-overlay`), machine detail popup (`#machine-popup`,
  `.mpop-*` classes), booking flow views (`#bk-select`, `#bk-info` with `.bk-page`
  sub-pages a/b/c).
- `style.css` (1879 lines) — all styling for hero/nav/machine cards/popup/training.
- `main.js` (634 lines) — login state, tab-selector animation, machine popup rendering,
  training badges. See `mem:frontend/main-js`.
- `booking.css` (1104 lines) — styling for the booking flow only.
- `booking.js` (403 lines) — booking flow logic (calendar, slots, confirm). See
  `mem:frontend/booking-js`.

CLAUDE.md at repo root already documents high-level architecture and CSS conventions —
read it first; the memories here add things CLAUDE.md does not cover (data shapes,
naming conventions, cross-file wiring).

Further memories: `mem:tech_stack`, `mem:suggested_commands`, `mem:conventions`,
`mem:task_completion`, `mem:frontend/main-js`, `mem:frontend/booking-js`.
