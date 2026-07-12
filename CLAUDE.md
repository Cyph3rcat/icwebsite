# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

No build system. Open `index.html` directly in a browser. Use a local server to avoid asset loading issues:

```
python -m http.server 8080
# or
npx serve .
```

There are no tests, no linter, and no package manager.

## Architecture

Three source files drive the entire page:

- **`index.html`** — Full single-page layout: hero section, machine-type tab nav, and machine detail sections (one per machine type: 3D Printer, Laser Cutter, UV Printer, 3D Scanner).
- **`style.css`** — All styles. No preprocessor. Uses CSS custom properties (`--yellow`, `--blue`, `--blue-300`, `--text-blue`, `--bg`, `--text`) and `clamp()` with `vw` units throughout for fluid scaling between mobile and 1920px max.
- **`main.js`** — Handles three concerns: login/logout state (swapping hero video and SVG text paths), tab-selector animation (JS reads tab `offsetLeft`/`offsetWidth` and sets inline styles on `.tab-selector`), and training badge randomization on login.

## Key CSS Patterns

**Machine card hover animation:** `.machine-card__info` (absolute, bottom-anchored) is offset downward by `translateY(clamp(50px, 5.61vw, 108px))` — exactly equal to the detail-bar's height — so only the name-bar peeks at the card bottom. On hover, `translateY(0)` reveals the full info panel. The name-bar is `display: inline-block` so it shrinks to text width (not full card width).

**Responsive sizing:** All spacing, font sizes, and element sizes use `clamp(min, Xvw, max)`. The pattern is `clamp(mobile-min, fluid-vw, desktop-max)` with 1920px as the design reference.

**Tab selector:** `.tab-selector` is a positioned div whose `left`, `top`, `width`, and `height` are set by JS (`moveSelectorTo()`), not by class changes. The CSS transition animates between positions.

## Login State

`LoggedIn` is a plain JS boolean (not persisted). On login: hero video swaps to `video_dynamicinfo_2.webm`, the CTA SVG `d` path changes to show logged-in text ("Find Your Booking"), and training badges are randomised after 1.5s to `passed` or `notpass` CSS classes. On logout everything is restored from saved path strings.



