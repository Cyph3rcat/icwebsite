// Client for the IE Maker Lab PHP backend (iemakerlab/booking). Off the PolyU host,
// or with ?mock in the URL, it uses an in-browser mock with the same response shapes.
const BOOKING_ROOT = '/ic/iemakerlab/booking';
const API_ROOT = `${BOOKING_ROOT}/api`;

export const USE_MOCK =
  !location.hostname.endsWith('polyu.edu.hk') || new URLSearchParams(location.search).has('mock');

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

export const NOT_TRAINED = 'Not Trained User';

async function request(method, path, body) {
  const res = await fetch(`${API_ROOT}/${path}`, {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers: body
      ? { Accept: 'application/json', 'Content-Type': 'application/json' }
      : { Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON (e.g. SSO redirect page) */ }
  if (!res.ok || !json) {
    throw new ApiError(json?.Message || json?.message || `Request failed (${res.status})`, res.status);
  }
  return json;
}

function toBooking(row) {
  return {
    id: row.booking_id,
    date: row.service_date,
    slotId: String(row.service_timeslot_id),
    label: row.service_timeslot_display,
    printerType: row.printer_type,
    status: Number(row.status),
    canCancel: Number(row.cancel_booking_allow) === 1,
  };
}

function toAvailability(json) {
  return {
    dates: json['Available Date'] || [],
    printers: (json['3D Printer'] || []).map(p => ({
      type: p['Printer Type'],
      sessions: (p.Session || []).map(s => ({
        date: s.Date,
        id: String(s['Timeslot ID']),
        label: s['Display Timeslot'],
        status: s.Availability, // 'Available' | 'Full' | 'Unavailable'
      })),
    })),
  };
}

/* ---------- Public API ---------- */

// -> { loggedIn, userId }
export async function getSession() {
  if (USE_MOCK) return mock.getSession();
  try {
    const json = await request('GET', 'session.php');
    return { loggedIn: !!json.logged_in, userId: json.user_id || '' };
  } catch (err) {
    if (err.status === 401) return { loggedIn: false, userId: '' };
    throw err;
  }
}

// Real mode leaves the page for PolyU SSO, so the returned promise never settles.
export function login() {
  if (USE_MOCK) return mock.login();
  location.href = `${BOOKING_ROOT}/`;
  return new Promise(() => {});
}

export function logout() {
  if (USE_MOCK) return mock.logout();
  location.href = `${BOOKING_ROOT}/logout/`;
  return new Promise(() => {});
}

// -> { dates: ['YYYY-MM-DD'], printers: [{ type, sessions: [{ date, id, label, status }] }] }
// Throws ApiError with message NOT_TRAINED if the user hasn't passed 3D printer training.
export async function getAvailability() {
  const json = USE_MOCK ? mock.printerStatus() : await request('GET', '3Dprinter/printerStatus.php');
  return toAvailability(json);
}

// -> { printer: bool, ... } for the machine sections we have data for
export async function getTrainingStatus() {
  if (USE_MOCK) return mock.trainingStatus();
  try {
    await getAvailability();
    return { printer: true };
  } catch (err) {
    return err.message === NOT_TRAINED ? { printer: false } : {};
  }
}

// -> [{ id, date: 'YYYY-MM-DD', slotId, label, printerType, status, canCancel }]
export async function listBookings() {
  const json = USE_MOCK ? mock.listBookings() : await request('GET', '3Dprinter/MyBooking.php');
  return (json['Booking Record'] || []).map(toBooking);
}

// items: [{ date: 'YYYY-MM-DD', slotId, printerType }]
export async function createBookings(items) {
  const body = {
    'New Booking': items.map(i => ({
      service_date: i.date,
      service_timeslot_id: i.slotId,
      printer_type: i.printerType,
    })),
  };
  return USE_MOCK ? mock.createBookings(body) : request('POST', '3Dprinter/MyBooking.php', body);
}

export async function cancelBooking(bookingId) {
  const body = { 'Delete Booking': [{ booking_id: bookingId }] };
  return USE_MOCK ? mock.cancelBookings(body) : request('DELETE', '3Dprinter/MyBooking.php', body);
}

/* ---------- Mock backend (local development) ---------- */

const mock = (() => {
  const SESSION_KEY = 'icml.mock.session';
  const BOOKINGS_KEY = 'icml.mock.bookings';
  const USER_ID = '2502838D';
  const PRINTERS = [
    { type: 'Bambu X1 Carbon', quantity: 4 },
    { type: 'Creality K1 Max', quantity: 2 },
  ];
  const TIMESLOTS = [
    { id: '830', start: '08:30', end: '12:30' },
    { id: '1230', start: '12:30', end: '16:30' },
    { id: '1630', start: '16:30', end: '09:30' },
  ];

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  };
  const ymd = d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const delay = value => new Promise(resolve => setTimeout(() => resolve(value), 250));
  const fail = (message, status = 400) => Promise.reject(new ApiError(message, status));
  const slotLabel = id => {
    const s = TIMESLOTS.find(t => t.id === String(id));
    return s ? `${s.start} - ${s.end}` : 'Unknown session';
  };
  const loggedIn = () => read(SESSION_KEY, false) === true;
  const active = () => read(BOOKINGS_KEY, []).filter(b => b.status === 0 && b.service_date >= ymd(new Date()));

  function allowDates() {
    const dates = [];
    const d = new Date();
    for (let i = 0; i <= 14; i++, d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(ymd(d));
    }
    return dates;
  }

  function sessionPassed(date, slot) {
    if (date !== ymd(new Date())) return false;
    const end = slot.end > slot.start ? slot.end : '17:30';
    const [h, m] = end.split(':').map(Number);
    const cutoff = new Date();
    cutoff.setHours(h, m - 10, 0, 0);
    return new Date() >= cutoff;
  }

  return {
    getSession: () => delay({ loggedIn: loggedIn(), userId: loggedIn() ? USER_ID : '' }),
    login: () => { write(SESSION_KEY, true); return delay(); },
    logout: () => { write(SESSION_KEY, false); return delay(); },
    trainingStatus: () => delay({ printer: true, laser: true, uv: false, scanner: false }),

    printerStatus() {
      if (!loggedIn()) throw new ApiError('Unauthorized', 401);
      const dates = allowDates();
      const booked = active();
      return {
        'Available Date': dates,
        '3D Printer': PRINTERS.map(p => ({
          'Printer Type': p.type,
          Session: dates.flatMap(date => TIMESLOTS.map(slot => {
            const taken = booked.filter(b =>
              b.printer_type === p.type && b.service_date === date && b.service_timeslot_id === slot.id).length;
            // Every third weekday afternoon is fully reserved, to exercise the "Full" state
            const reserved = slot.id === '1230' && new Date(date).getDate() % 3 === 0 ? p.quantity : 0;
            let availability = taken + reserved >= p.quantity ? 'Full' : 'Available';
            if (sessionPassed(date, slot)) availability = 'Unavailable';
            return { Date: date, 'Timeslot ID': slot.id, 'Display Timeslot': slotLabel(slot.id), Availability: availability };
          })),
        })),
      };
    },

    listBookings() {
      if (!loggedIn()) throw new ApiError('Unauthorized', 401);
      return {
        'Booking Record': active().map(b => ({
          ...b,
          service_timeslot_display: slotLabel(b.service_timeslot_id),
          cancel_booking_allow: sessionPassed(b.service_date, TIMESLOTS.find(t => t.id === b.service_timeslot_id)) ? 0 : 1,
        })),
      };
    },

    createBookings(body) {
      if (!loggedIn()) return fail('Unauthorized', 401);
      const items = body['New Booking'];
      const seen = new Set();
      for (const i of items) {
        const key = `${i.service_date}|${i.service_timeslot_id}`;
        if (seen.has(key)) return fail('You can only book one printer in a single session.');
        seen.add(key);
        if (active().some(b => b.service_date === i.service_date && b.service_timeslot_id === i.service_timeslot_id)) {
          return fail(`You cannot book the following sessions, since you have already booked the following sessions:\n${i.service_date} (${slotLabel(i.service_timeslot_id)})\nPlease try again`);
        }
      }
      const all = read(BOOKINGS_KEY, []);
      items.forEach(i => all.push({
        booking_id: `CXC-3DP-MOCK-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        booking_timestamp: new Date().toISOString(),
        service_date: i.service_date,
        service_timeslot_id: String(i.service_timeslot_id),
        printer_type: i.printer_type,
        status: 0,
      }));
      write(BOOKINGS_KEY, all);
      return delay({ Status: 'Success', Message: 'New Booking Added' });
    },

    cancelBookings(body) {
      if (!loggedIn()) return fail('Unauthorized', 401);
      const ids = new Set(body['Delete Booking'].map(d => d.booking_id));
      write(BOOKINGS_KEY, read(BOOKINGS_KEY, []).map(b => (ids.has(b.booking_id) ? { ...b, status: 2 } : b)));
      return delay({ Status: 'Success', Message: 'Booking Cancelled' });
    },
  };
})();
