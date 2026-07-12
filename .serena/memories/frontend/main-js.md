
# main.js structure

Handles three concerns (per CLAUDE.md): login state, tab-selector animation, machine
popup + training badges.

- `LoggedIn` — plain boolean, not persisted (resets on reload).
- `doLogin`/`loggedinStatus`/`loggedOutStatus` — swap hero video + CTA SVG path strings
  (`ctaPath_lg`/`ctaPath_sm`) between logged-in/out states.
- `moveSelectorTo`/`positionTabIndicator` — reads tab `offsetLeft`/`offsetWidth` and sets
  inline styles on `.tab-selector`; recalculated on `window.resize`.
- `openMachinePopup`/`closeMachinePopup`/`renderMachinePopup` — builds the `.mpop-*`
  popup DOM from `machineDetailData[currentMachineKey]`; `MPOP_ICON`/`MPOP_FEATURE_BG`/
  `MPOP_PRINTER_COMMON` are shared lookup/constant tables referenced by that data.
  `mpopSideBtns`/`setActiveSideBtn`/`mpopSideNavLocked`/`updateSideNav` drive the popup's
  side navigation; `mpopSectionGap` and `updateHeaderHeight` handle popup internal layout.
- `openTrainingModal`/`closeTrainingModal`/`setDemoTrainingStatus` — training badge
  modal; badges randomized to `passed`/`notpass` CSS classes ~1.5s after login.
- `updateBooknowButton` — wires the popup's CTA into the booking flow
  (`openBookingFlow` in booking.js).
