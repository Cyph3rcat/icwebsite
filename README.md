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

Anywhere other than `*.polyu.edu.hk` (or with `?mock` in the URL), `api.js` uses a
built-in mock backend instead of the real API: login is instant (user `2502838D`),
there are two printers and three sessions a day, and bookings persist in
`localStorage`. Clear site data to reset it.

## Layout

| File | What's in it |
| --- | --- |
| `index.html` | All markup, desktop and phone |
| `main.js` | Entry module: login, machine list, machine detail popups, phone CTAs |
| `booking.js` | Booking flow, hero ticket, ticket popup, manage-booking sheet |
| `api.js` | Backend client (PolyU PHP API), plus the local mock |
| `style.css` / `booking.css` | Styles for `main.js` / `booking.js` respectively |
| `server/session.php` | Login-status endpoint to deploy into the PHP app (see below) |

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

## Backend

The front end talks to the existing PHP app (`iemakerlab/`, kept out of this repo
because it contains SSO and database credentials). Everything lives under
`/ic/iemakerlab/booking` on `www.polyu.edu.hk`.

| Front end | Backend |
| --- | --- |
| Login | Redirect to `booking/` → PolyU SSO (`polyusso/`) → back to `SSO_LANDING_PAGE` |
| Logout | Redirect to `booking/logout/` (ends the session, then ADFS logout) |
| Session check, user ID | `GET api/session.php` (new, from `server/`) |
| Bookable dates and sessions | `GET api/3Dprinter/printerStatus.php` |
| Training badge (3D printer) | Same call: `401 "Not Trained User"` means not trained |
| My bookings | `GET api/3Dprinter/MyBooking.php` |
| Book | `POST api/3Dprinter/MyBooking.php` `{ "New Booking": [{ service_date, service_timeslot_id, printer_type }] }` |
| Cancel | `DELETE api/3Dprinter/MyBooking.php` `{ "Delete Booking": [{ booking_id }] }` |

Auth is the `access_token` cookie set by `polyusso/callback.php` with path
`/ic/iemakerlab/booking`, so **the front end must be served from `www.polyu.edu.hk`**
(same origin as the API); it won't work cross-origin.

### Deploying

1. Upload the front end (`index.html`, `*.js`, `*.css`, `assets/`) to a folder on the
   PolyU server, e.g. `/ic/iemakerlab/booking/app/`.
2. Copy `server/session.php` to `iemakerlab/booking/api/session.php`.
3. Set `SSO_LANDING_PAGE` in `iemakerlab/.env` to the front end's URL, so SSO returns
   there after login.
4. Check that the printer names in the `3d_printer_booking_quantity` table match the
   `printerType` patterns in `bkMachineData` (`booking.js`); Bambu matches `/bambu/i`.

### How the booking model maps

- Sessions come from the `3d_print_timeslot` table, so the slot buttons show whatever
  sessions exist for that date and printer (start time + length), not fixed hours.
- Up to 3 sessions per booking (front-end rule, as in the old site). The server
  rejects booking the same session twice or two printers in one session.
- Each booked session is its own record and ticket, with its own `booking_id`. Cancel
  is disabled when the server says `cancel_booking_allow: 0`.
- Errors from the server (session full, already booked, blacklisted) are shown as alerts.

## Current state

- Only the Bambu X1 has a booking flow; other machines only open their detail popup.
  To add one, add an entry to `bkMachineData` and allow it in the book buttons in `main.js`.
- Training badges: the 3D printer badge comes from the backend. The backend has no
  training data for the laser cutter, UV printer or scanner, so those stay at
  "Training Required ⓘ" on the live site (the mock shows demo values).
- Machine content (`machineDetailData` in `main.js`) is hardcoded.
