# IE Maker lab Website

Designed by students of the Hong Kong Polytechnic University to book the facilities available in the *Industrial Centre*. This repo is the booking front end: static HTML/CSS/JS, no build step.

## Running locally

The scripts are ES modules, so the page has to be served over HTTP — opening
`index.html` straight from disk (`file://`) won't load them. Any static server works:

```sh
npx serve .
# or
python -m http.server 8000
```

## Layout

| File | What's in it |
| --- | --- |
| `index.html` | All markup, desktop and phone |
| `main.js` | Entry module: login, machine list, machine detail popups, phone CTAs |
| `booking.js` | Booking flow, hero ticket, ticket popup, manage-booking sheet |
| `store.js` | Persistence (login + bookings), currently `localStorage` |
| `style.css` / `booking.css` | Styles for `main.js` / `booking.js` respectively |

**Desktop vs phone.** The phone layout is a separate Figma design, not a resized desktop.
An inline script in `<head>` adds `html.is-mobile` or `html.is-desktop` once, from the
user agent, and `isMobileDevice()` dispatches to the matching markup:

| Desktop | Phone |
| --- | --- |
| `#machine-popup`, `.mpop-*` | `#machine-popup-mobile`, `.mpopm-*` |
| `#bk-select` / `#bk-info`, `.bk-*` | `#bkp-select` / `#bkp-info` / `#bkp-manage`, `.bkp-*` |

Shrinking a desktop browser window does **not** switch to the phone layout (on purpose).
Use the device toolbar in DevTools and reload.

**Sizing.** Desktop popups scale from their Figma frame: `--u` / `--bk` = 1 Figma px,
so `calc(24 * var(--u))` is 24px in the design. Phone styles use plain px against a
402px-wide frame.

## Current state

- Login is a demo toggle (fixed user ID). The training badges are demo data too.
- Only the Bambu X1 has a booking flow; other machines only open their detail popup.
- Machine content (`machineDetailData` in `main.js`) and time slots (`BK_SLOT_HOURS`,
  `BK_AVAILABLE` in `booking.js`) are hardcoded.
- Bookings live in `localStorage` via `store.js`; logging out clears them.

## Connecting the backend

The existing PHP app (`iemakerlab/`, not in this repo) has the API at
`booking/api/3Dprinter/MyBooking.php`. It requires a PolyU SSO session
(`booking/polyusso/`) and returns 401 otherwise.

| Method | Body | Returns |
| --- | --- | --- |
| `GET` | – | `{ "Booking Record": [{ booking_id, service_date, service_timeslot_id, service_timeslot_display, printer_type, status, cancel_booking_allow }] }` |
| `POST` | `{ "New Booking": [{ service_date: "YYYY-MM-DD", service_timeslot_id, printer_type }] }` | |
| `DELETE` | `{ "Delete Booking": [{ booking_id }] }` | |

What has to change:

1. Replace `loadBookings` / `saveBookings` in `store.js` with `GET` / `POST` / `DELETE`
   calls. Those become async, so their callers in `booking.js` (`bkCommitBooking`,
   `tkConfirmCancel`, `bkpConfirmCancel`, `bkRestoreBookings`) need to `await` them.
2. Map the front-end booking `{ machine, date, hours: [9, 10] }` to the API's shape:
   one row per time slot, `hours` → `service_timeslot_id` (IDs come from the timeslot
   table, see `GetTimeslot()` in `general_function.php`), `machine` → `printer_type`.
   Keep the `booking_id`s so cancel can send them.
3. Replace the demo login (`doLogin` and `loadLogin` / `saveLogin`) with the SSO
   redirect, and load slot availability from the server instead of `BK_AVAILABLE`.
