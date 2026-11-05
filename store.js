// Demo persistence in localStorage. To go live, replace these with calls to
// iemakerlab/booking/api/3Dprinter/MyBooking.php (see README.md).
const LOGIN_KEY = 'icml.loggedIn';
const BOOKINGS_KEY = 'icml.bookings';

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* storage unavailable (private mode, blocked) */ }
}

export function loadLogin() {
  return read(LOGIN_KEY) === '1';
}

export function saveLogin(loggedIn) {
  write(LOGIN_KEY, loggedIn ? '1' : null);
}

export function loadBookings() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  try {
    return (JSON.parse(read(BOOKINGS_KEY)) || [])
      .map(b => ({ ...b, date: new Date(b.date) }))
      .filter(b => b.date >= today);
  } catch {
    return [];
  }
}

export function saveBookings(bookings) {
  write(BOOKINGS_KEY, bookings.length ? JSON.stringify(bookings) : null);
}
