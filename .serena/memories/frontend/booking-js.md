
# booking.js structure

Self-contained booking flow, namespaced with `bk`/`$bk` prefix; entry point is
`openBookingFlow` (called from main.js's booknow button).

- State: `bkState` (current booking selections), `bkCalMonth`/`bkCalPick`/`bkWeekStart`
  (calendar cursor/selection), `bkInfoPage` (which `.bk-page` a/b/c is active),
  `bkSafetyChecked`.
- Data: `bkMachineData` keyed by machine slug (parallels `machineDetailData` in main.js —
  keep slugs in sync if adding a machine). `BK_AVAILABLE` = availability rules,
  `BK_SLOT_HOURS` = bookable hour slots, `BK_INFO_HINTS`/`BK_INFO_ORDER` drive the
  info-page (`#bk-info`) content/ordering.
- Calendar math: `bkMonday`/`bkIsoWeek`/`bkAddDays`/`bkSameDay`/`bkIsWeekend`/`bkToday`/
  `bkFirstBookable`/`bkIsBookable` — plain-date helpers, no library.
- Render functions: `bkRenderCalendar`/`bkRenderWeek`/`bkRenderSlots`/`bkRenderSelect`/
  `bkRenderTicket` rebuild DOM from state on every change (no diffing/virtual DOM).
- Flow control: `bkOpenCalendar`/`bkConfirmCalendar`/`bkCloseCalendar`,
  `bkOpenInfo`/`bkInfoContinue`/`bkShowInfoPage`, `bkOpenConfirm`/`bkConfirmBooking`/
  `bkCloseConfirm`, `bkFinish`. `bkOnLogout` resets booking state when main.js logs out.
