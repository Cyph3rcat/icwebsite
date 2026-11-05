import {
  LoggedIn, isMobileDevice, openMachinePopup, closeMachinePopup,
  openMobileMachinePopup, closeMobileMachinePopup, updateMlistCta, openTrainingModal,
} from './main.js';
import { ApiError, NOT_TRAINED, getAvailability, listBookings, createBookings, cancelBooking } from './api.js';

// printerType is matched against the backend's printer_type names
const bkMachineData = {
  bambu: {
    name: 'Bambu X1 Carbon',
    printerType: /bambu/i,
    venue: 'W503',
    photo: 'assets/booking/booking_photo.jpg',
  },
};
const BK_FALLBACK_MACHINE = { venue: 'W503', photo: 'assets/booking/booking_photo.jpg' };

const BK_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const BK_DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
const BK_DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function bkToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function bkAddDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function bkSameDay(a, b) { return a && b && a.getTime() === b.getTime(); }
function bkIsWeekend(d) { return d.getDay() === 0 || d.getDay() === 6; }
function bkMonday(d) { return bkAddDays(d, -((d.getDay() + 6) % 7)); }
function bkIsoWeek(d) {
  const t = new Date(d);
  t.setDate(t.getDate() + 4 - (t.getDay() || 7)); // nearest Thursday
  const jan1 = new Date(t.getFullYear(), 0, 1);
  return Math.ceil(((t - jan1) / 86400000 + 1) / 7);
}
function bkYmd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function bkParseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function bkEsc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Availability for the machine being booked, from printerStatus.php
let bkAvail = null; // { printerType, dates: sorted ['YYYY-MM-DD'], sessions: [{ date, id, label, status }] }

function bkIsBookable(d) { return !!bkAvail && bkAvail.dates.includes(bkYmd(d)); }
function bkFirstBookable(from) {
  const first = bkAvail && bkAvail.dates.find(s => s >= bkYmd(from));
  return first ? bkParseYmd(first) : null;
}
function bkLastBookable() {
  return bkAvail && bkAvail.dates.length ? bkParseYmd(bkAvail.dates[bkAvail.dates.length - 1]) : bkToday();
}
function bkSlotsFor(d) {
  const ymd = bkYmd(d);
  return bkAvail ? bkAvail.sessions.filter(s => s.date === ymd) : [];
}
function bkSelectedSlots() {
  return bkSlotsFor(bkState.date).filter(s => bkState.slots.includes(s.id));
}
function bkSetDate(d) {
  bkState.date = d;
  const first = bkSlotsFor(d).find(s => s.status === 'Available');
  bkState.slots = first ? [first.id] : [];
}

// "08:30 - 12:30" -> 4; sessions ending at or before their start run overnight
function bkSlotHours(label) {
  const [start, end] = label.split('-').map(t => {
    const [h, m] = t.trim().split(':').map(Number);
    return h * 60 + m;
  });
  const mins = end > start ? end - start : end + 24 * 60 - start;
  return Math.round(mins / 6) / 10;
}
function bkSlotStart(label) { return label.split('-')[0].trim(); }
function bkHoursText(h) { return `${h} Hour${h === 1 ? '' : 's'}`; }

function bkMachineKeyFor(printerType) {
  return Object.keys(bkMachineData).find(k => bkMachineData[k].printerType.test(printerType)) || null;
}
function bkMachineInfo(b) {
  return bkMachineData[b.machine] || { ...BK_FALLBACK_MACHINE, name: b.printerType };
}
function bkWhenLabel(d) {
  const days = Math.round((d - bkToday()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  const thisMonday = bkMonday(bkToday());
  const weekDiff = Math.round((bkMonday(d) - thisMonday) / (7 * 86400000));
  if (weekDiff === 0) return 'This ' + BK_DOW_FULL[d.getDay()];
  if (weekDiff === 1) return 'Next ' + BK_DOW_FULL[d.getDay()];
  return 'In ' + days + ' days';
}
function bkRelLabel(d) {
  const days = Math.round((d - bkToday()) / 86400000);
  if (days === 0) return 'Today';
  return days + (days === 1 ? ' Day later' : ' Days later');
}
// slots: objects with a `label` (selected sessions or bookings)
function bkSectionText(slots) {
  if (!slots.length) return 'No session selected';
  const hours = slots.reduce((n, s) => n + bkSlotHours(s.label), 0);
  const time = slots.length === 1 ? slots[0].label : `${slots.length} Sessions`;
  return `${time} (${bkHoursText(hours)})`;
}
function bkDayText(d) {
  return `${BK_MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()} ${BK_DOW_FULL[d.getDay()]}`;
}

const BK_MAX_SLOTS = 3;

const bkState = {
  machine: 'bambu',
  date: null,
  slots: [], // selected timeslot IDs on `date`
  bookings: [], // { id, machine, printerType, date, slotId, label, canCancel }
  lastBooked: null,
  heroIndex: 0,
};
let bkBusy = false;
let bkWeekStart = null;
let bkCalMonth = null;
let bkCalPick = null;
let bkInfoPage = 'a';

const $bk = id => document.getElementById(id);

/* ============================================================
   SELECT SECTION VIEW
============================================================ */

async function bkLoadAvailability(machine) {
  const data = await getAvailability();
  const printer = data.printers.find(p => machine.printerType.test(p.type));
  if (!printer) throw new ApiError(`${machine.name} is not open for booking right now.`);
  bkAvail = {
    printerType: printer.type,
    sessions: printer.sessions,
    dates: [...new Set(printer.sessions.map(s => s.date))].sort(),
  };
}

async function openBookingFlow(machineKey) {
  const machine = bkMachineData[machineKey];
  if (!machine || bkBusy) return;
  bkBusy = true;
  try {
    await bkLoadAvailability(machine);
  } catch (err) {
    closeMachinePopup();
    if (err.message === NOT_TRAINED) openTrainingModal('printer');
    else alert(err.message);
    return;
  } finally {
    bkBusy = false;
  }
  const first = bkFirstBookable(bkToday());
  if (!first) { alert('No dates are open for booking right now.'); return; }

  closeMachinePopup();
  bkState.machine = machineKey;
  bkSetDate(first);
  if (isMobileDevice()) { bkpOpenSelect(); return; }
  bkWeekStart = bkMonday(bkState.date);
  bkRenderSelect();
  $bk('bk-select').classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function bkCloseSelect(reopenPopup) {
  $bk('bk-select').classList.remove('is-open');
  document.body.style.overflow = '';
  if (reopenPopup) openMachinePopup(bkState.machine);
}

function bkRenderSelect() {
  bkRenderWeek();
  bkRenderSlots();
  bkRenderTicket();
}

function bkRenderWeek() {
  $bk('bk-week-chip').textContent = 'Week ' + bkIsoWeek(bkWeekStart);
  $bk('bk-month-chip').textContent = BK_MONTHS[bkState.date.getMonth()];
  $bk('bk-week-prev').disabled = bkWeekStart <= bkMonday(bkToday());
  $bk('bk-week-next').disabled = bkAddDays(bkWeekStart, 7) > bkLastBookable();

  const days = $bk('bk-days');
  days.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const d = bkAddDays(bkWeekStart, i);
    const btn = document.createElement('button');
    btn.className = 'bk-day';
    btn.innerHTML = `<span class="dow">${BK_DOW[d.getDay()]}</span><span class="num">${d.getDate()}</span>`;
    if (!bkIsBookable(d)) btn.disabled = true;
    if (bkSameDay(d, bkToday())) btn.classList.add('is-today');
    if (bkSameDay(d, bkState.date)) btn.classList.add('is-selected');
    btn.addEventListener('click', () => {
      bkSetDate(d);
      bkRenderSelect();
    });
    days.appendChild(btn);
  }
}

function bkRenderSlotButtons(wrap, cls) {
  wrap.innerHTML = '';
  bkSlotsFor(bkState.date).forEach(s => {
    const btn = document.createElement('button');
    btn.className = cls;
    btn.innerHTML = `<span class="t">${bkEsc(bkSlotStart(s.label))}</span>` +
      `<span class="d">(${s.status === 'Available' ? bkHoursText(bkSlotHours(s.label)) : bkEsc(s.status)})</span>`;
    btn.title = s.label;
    if (s.status !== 'Available') btn.disabled = true;
    if (bkState.slots.includes(s.id)) btn.classList.add('is-selected');
    btn.addEventListener('click', () => bkToggleSlot(s.id, btn));
    wrap.appendChild(btn);
  });
}

function bkRenderSlots() {
  bkRenderSlotButtons($bk('bk-slots'), 'bk-slot');
  const sel = bkSelectedSlots();
  const hours = sel.reduce((n, s) => n + bkSlotHours(s.label), 0);
  $bk('bk-selected-time').textContent = sel.length ? sel.map(s => s.label).join(', ') : 'No session selected';
  $bk('bk-selected-dur').textContent = `${bkHoursText(hours)} Section`;
  $bk('bk-book-btn').disabled = !sel.length;
}

function bkToggleSlot(id, btn) {
  if (bkState.slots.includes(id)) {
    bkState.slots = bkState.slots.filter(x => x !== id);
  } else if (bkState.slots.length >= BK_MAX_SLOTS) {
    bkFlashMaxHours(btn);
    return;
  } else {
    bkState.slots = bkState.slots.concat(id);
  }
  if (isMobileDevice()) { bkpRenderSlots(); bkpRenderTicket(); }
  else { bkRenderSlots(); bkRenderTicket(); }
}

function bkFlashMaxHours(btn) {
  if (!btn || btn.dataset.bkFlashing) return;
  const original = btn.innerHTML;
  btn.dataset.bkFlashing = '1';
  btn.innerHTML = '<span class="t">Maximum 3 Selection</span>';
  setTimeout(() => {
    if (btn.dataset.bkFlashing) {
      btn.innerHTML = original;
      delete btn.dataset.bkFlashing;
    }
  }, 1200);
}

function bkRenderTicket() {
  const data = bkMachineData[bkState.machine];
  const d = bkState.date;
  $bk('bk-ticket-name').textContent = data.name;
  $bk('bk-ticket-when').textContent = bkWhenLabel(d);
  $bk('bk-ticket-date').textContent = `${BK_MONTHS[d.getMonth()]} ${d.getDate()}`;
  $bk('bk-ticket-section').textContent = bkSectionText(bkSelectedSlots());
}

/* ============================================================
   CALENDAR POPUP
============================================================ */

function bkOpenCalendar() {
  bkCalPick = new Date(bkState.date);
  bkCalMonth = new Date(bkState.date.getFullYear(), bkState.date.getMonth(), 1);
  bkRenderCalendar();
  $bk('bk-cal-overlay').classList.add('is-open');
}

function bkCloseCalendar() {
  $bk('bk-cal-overlay').classList.remove('is-open');
}

function bkRenderCalendar() {
  $bk('bk-cal-year').textContent = bkCalMonth.getFullYear();
  $bk('bk-cal-month').textContent = BK_MONTHS[bkCalMonth.getMonth()];
  const thisMonth = new Date(bkToday().getFullYear(), bkToday().getMonth(), 1);
  $bk('bk-cal-prev').disabled = bkCalMonth <= thisMonth;
  const last = bkLastBookable();
  $bk('bk-cal-next').disabled = bkCalMonth >= new Date(last.getFullYear(), last.getMonth(), 1);

  const grid = $bk('bk-cal-grid');
  grid.innerHTML = '';
  const gridStart = bkAddDays(bkCalMonth, -bkCalMonth.getDay());
  const rows = Math.ceil((bkCalMonth.getDay() +
    new Date(bkCalMonth.getFullYear(), bkCalMonth.getMonth() + 1, 0).getDate()) / 7);
  for (let i = 0; i < rows * 7; i++) {
    const d = bkAddDays(gridStart, i);
    const btn = document.createElement('button');
    btn.className = 'bk-cal-day';
    btn.textContent = d.getDate();
    const inMonth = d.getMonth() === bkCalMonth.getMonth();
    if (!inMonth || !bkIsBookable(d)) {
      btn.disabled = true;
      if (inMonth && bkIsWeekend(d) && d >= bkToday()) btn.classList.add('is-we');
    }
    if (bkSameDay(d, bkCalPick)) btn.classList.add('is-selected');
    btn.addEventListener('click', () => {
      bkCalPick = d;
      bkRenderCalendar();
    });
    grid.appendChild(btn);
  }
}

function bkConfirmCalendar() {
  if (!bkSameDay(bkCalPick, bkState.date)) bkSetDate(bkCalPick);
  bkWeekStart = bkMonday(bkCalPick);
  bkRenderSelect();
  bkCloseCalendar();
}

/* ============================================================
   CONFIRM BOOKING OVERLAY
============================================================ */

let bkSafetyChecked = false;

function bkOpenConfirm() {
  if (!bkSelectedSlots().length) return;
  bkSafetyChecked = false;
  $bk('bk-safety').classList.remove('is-checked');
  $bk('bk-confirm-btn').classList.remove('is-enabled');
  const d = bkState.date;
  $bk('bk-confirm-name').textContent = bkMachineData[bkState.machine].name;
  $bk('bk-confirm-when').textContent = bkWhenLabel(d);
  $bk('bk-confirm-section').textContent = bkSectionText(bkSelectedSlots());
  $bk('bk-confirm-date').textContent =
    `${BK_MONTHS[d.getMonth()]} ${d.getDate()} (Week ${bkIsoWeek(d)})`;
  $bk('bk-confirm-overlay').classList.add('is-open');
}

function bkCloseConfirm() {
  $bk('bk-confirm-overlay').classList.remove('is-open');
}

function bkToggleSafety() {
  bkSafetyChecked = !bkSafetyChecked;
  $bk('bk-safety').classList.toggle('is-checked', bkSafetyChecked);
  $bk('bk-confirm-btn').classList.toggle('is-enabled', bkSafetyChecked);
}

// Re-reads the user's bookings from the server
async function bkRefreshBookings() {
  const today = bkYmd(bkToday());
  const rows = await listBookings();
  bkState.bookings = rows
    .filter(r => (r.status === 0 || r.status === 1) && r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || Number(a.slotId) - Number(b.slotId))
    .map(r => ({
      id: r.id,
      machine: bkMachineKeyFor(r.printerType),
      printerType: r.printerType,
      date: bkParseYmd(r.date),
      slotId: r.slotId,
      label: r.label,
      canCancel: r.canCancel,
    }));
  const lastId = bkState.lastBooked && bkState.lastBooked.id;
  bkState.lastBooked = bkState.bookings.find(b => b.id === lastId) || null;
}

// Books the selected sessions; lastBooked becomes the first of them
async function bkSubmitSelection() {
  const slots = bkSelectedSlots();
  const date = bkYmd(bkState.date);
  await createBookings(slots.map(s => ({ date, slotId: s.id, printerType: bkAvail.printerType })));
  await bkRefreshBookings();
  bkState.lastBooked = bkState.bookings.find(b =>
    bkYmd(b.date) === date && b.slotId === slots[0].id && b.printerType === bkAvail.printerType) || null;
}

async function bkConfirmBooking() {
  if (!bkSafetyChecked || bkBusy) return;
  bkBusy = true;
  try {
    await bkSubmitSelection();
  } catch (err) {
    alert(err.message);
    return;
  } finally {
    bkBusy = false;
  }
  bkCloseConfirm();
  $bk('bk-select').classList.remove('is-open');
  bkOpenInfo('a');
}

/* ============================================================
   INFO WIZARD (Booked successfully -> steps -> prepare)
============================================================ */

function bkOpenInfo(page, booking) {
  const b = booking || bkState.lastBooked;
  if (!b) return;
  const d = b.date;
  $bk('bk-info-machine').textContent = bkMachineInfo(b).name;
  $bk('bk-visit-rel').textContent = bkRelLabel(d);
  $bk('bk-visit-date').textContent = bkDayText(d);
  $bk('bk-session-total').textContent = `Total ${bkHoursText(bkSlotHours(b.label))}`;
  $bk('bk-session-time').textContent = b.label;

  bkShowInfoPage(page || 'a');
  $bk('bk-info').classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

const BK_INFO_HINTS = { a: 'What to do after arrive', b: 'What to prepare', c: 'continue to homepage' };
const BK_INFO_ORDER = ['a', 'b', 'c'];

function bkShowInfoPage(page) {
  bkInfoPage = page;
  BK_INFO_ORDER.forEach(p => {
    $bk('bk-page-' + p).classList.toggle('is-active', p === page);
  });
  document.querySelectorAll('.bk-dot').forEach(dot => {
    dot.classList.toggle('is-active', dot.dataset.page === page);
  });
  $bk('bk-next-hint').textContent = BK_INFO_HINTS[page];
}

function bkInfoContinue() {
  const i = BK_INFO_ORDER.indexOf(bkInfoPage);
  if (i < BK_INFO_ORDER.length - 1) {
    bkShowInfoPage(BK_INFO_ORDER[i + 1]);
  } else {
    bkFinish();
  }
}

function bkFinish() {
  $bk('bk-info').classList.remove('is-open');
  document.body.style.overflow = '';
  bkApplyHeroTicket();
  window.scrollTo({ top: 0 });
}

/* ============================================================
   HERO TICKET (homepage)
============================================================ */

function bkTicketSlideHTML(b, i) {
  const d = b.date;
  const whenLabel = bkWhenLabel(d);
  const whenClass = 'hero-ticket__when' +
    (whenLabel === 'Next Wednesday' ? ' hero-ticket__when--long' :
     whenLabel === 'This Wednesday' ? ' hero-ticket__when--wide' : '');
  return `
    <div class="hero-ticket__slide">
      <div class="hero-ticket__main">
        <div class="hero-ticket__circle hero-ticket__circle--tl"></div>
        <div class="hero-ticket__circle hero-ticket__circle--br"></div>
        <div class="hero-ticket__head">Booked Section</div>
        <img class="hero-ticket__printer" src="assets/booking/printer_cutout.png" alt="">
        <p class="hero-ticket__name">${bkEsc(bkMachineInfo(b).name)}</p>
        <div class="hero-ticket__meta">
          <div>
            <p class="l">Date</p>
            <p class="v">${BK_MONTHS[d.getMonth()]} ${d.getDate()}</p>
          </div>
          <div>
            <p class="l">Section</p>
            <p class="v">${bkEsc(bkSectionText([b]))}</p>
          </div>
        </div>
        <div class="${whenClass}">
          <span>${whenLabel}</span>
          <img src="assets/Icon/Arrow/Ticket_deco.svg" alt="">
        </div>
        <button class="hero-ticket__more" data-index="${i}">More</button>
      </div>
      <div class="hero-ticket__stub">
        <div class="hero-ticket__stub-head"></div>
        <p class="hero-ticket__stub-title">Book Ticket</p>
        <p class="hero-ticket__stub-sub">IE Maker Lab</p>
        <p class="hero-ticket__stub-barcode">IE maker Lab</p>
      </div>
    </div>`;
}

function bkRenderHeroTicket() {
  const n = bkState.bookings.length;
  $bk('hero-ticket-track').innerHTML = bkState.bookings.map(bkTicketSlideHTML).join('');
  $bk('hero-ticket-track').style.transform = `translateX(${-100 * bkState.heroIndex}%)`;
  $bk('hero-ticket-prev').hidden = bkState.heroIndex <= 0;
  $bk('hero-ticket-next').hidden = bkState.heroIndex >= n - 1;
  const dots = $bk('hero-ticket-dots');
  dots.hidden = n <= 1;
  dots.innerHTML = bkState.bookings.map((_, i) =>
    `<span class="hero-ticket__dot${i === bkState.heroIndex ? ' is-active' : ''}"></span>`).join('');
}

function bkHeroGoTo(i) {
  const n = bkState.bookings.length;
  if (!n) return;
  bkState.heroIndex = Math.max(0, Math.min(n - 1, i));
  bkRenderHeroTicket();
}

function bkApplyHeroTicket() {
  if (!bkState.bookings.length) return;
  const i = bkState.bookings.indexOf(bkState.lastBooked);
  bkState.heroIndex = i >= 0 ? i : bkState.bookings.length - 1;
  bkRenderHeroTicket();
  document.querySelector('.hero').classList.add('has-ticket');
}

/* ============================================================
   TICKET DETAIL POPUP (hero ticket "More" -> cancel booking)
============================================================ */

let tkIndex = -1; // -1 = empty state

function tkTabLabel(b) {
  return `${BK_MONTHS[b.date.getMonth()].slice(0, 3)} ${b.date.getDate()} Time: ${bkEsc(bkSlotStart(b.label))}`;
}

function tkRenderTabs() {
  const tabs = $bk('tkpop-tabs');
  tabs.innerHTML = '<div class="tkpop-tab-indicator"></div>' +
    bkState.bookings.map((b, i) =>
      `<button class="tkpop-tab${i === tkIndex ? ' is-active' : ''}" data-index="${i}">${tkTabLabel(b)}</button>`
    ).join('');
  tabs.hidden = !bkState.bookings.length;
  requestAnimationFrame(tkPositionIndicator);
}

function tkPositionIndicator() {
  const ind = document.querySelector('.tkpop-tab-indicator');
  const act = document.querySelector('.tkpop-tab.is-active');
  if (!ind) return;
  if (!act) { ind.style.width = '0'; return; }
  ind.style.left = act.offsetLeft + 'px';
  ind.style.width = act.offsetWidth + 'px';
}

// Toggle instead of rebuilding so the indicator slides from where it is
function tkSetActiveTab() {
  document.querySelectorAll('.tkpop-tab').forEach(tab => {
    tab.classList.toggle('is-active', Number(tab.dataset.index) === tkIndex);
  });
  requestAnimationFrame(tkPositionIndicator);
}

function tkRenderDetail() {
  const b = bkState.bookings[tkIndex];
  $bk('tkpop-card').hidden = !b;
  $bk('tkpop-empty').hidden = !!b;
  if (!b) return;
  const data = bkMachineInfo(b);
  const d = b.date;
  $bk('tkpop-photo').src = data.photo;
  $bk('tkpop-machine').textContent = data.name;
  $bk('tkpop-venue-code').textContent = data.venue;
  $bk('tkpop-visit-rel').textContent = bkRelLabel(d);
  $bk('tkpop-visit-date').textContent = bkDayText(d);
  $bk('tkpop-session-total').textContent = `Total ${bkHoursText(bkSlotHours(b.label))}`;
  $bk('tkpop-session-time').textContent = b.label;
  $bk('tkpop-cancel-btn').disabled = !b.canCancel;
}

function openTicketPopup(i) {
  tkIndex = i;
  tkRenderTabs();
  tkRenderDetail();
  $bk('tkpop-scrollport').scrollTop = 0;
  const overlay = $bk('ticket-popup');
  overlay.classList.remove('is-closing');
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeTicketPopup() {
  tkCloseCancel();
  const overlay = $bk('ticket-popup');
  overlay.classList.add('is-closing');
  overlay.setAttribute('aria-hidden', 'true');
  setTimeout(() => {
    overlay.classList.remove('is-open', 'is-closing');
    document.body.style.overflow = '';
  }, 340);
}

// Measure only after is-under-confirm is applied, so hover scale doesn't skew the rect
function tkPositionCancelPanel() {
  const btn = $bk('tkpop-cancel-btn');
  const panel = document.querySelector('.tkpop-cancel');
  const btnRect = btn.getBoundingClientRect();
  const overlap = btnRect.height * (18 / 65.7);
  panel.style.left = `${btnRect.left}px`;
  panel.style.top = `${btnRect.top + overlap - panel.offsetHeight}px`;
}

function tkOpenCancel() {
  const b = bkState.bookings[tkIndex];
  if (!b || !b.canCancel) return;
  $bk('tkpop-cancel-machine').textContent = bkMachineInfo(b).name;
  $bk('tkpop-cancel-date').textContent = bkDayText(b.date);
  $bk('tkpop-cancel-time').textContent = b.label;
  $bk('tkpop-cancel-btn').classList.add('is-under-confirm');
  tkPositionCancelPanel();
  $bk('tkpop-cancel-overlay').classList.add('is-open');
}

function tkCloseCancel() {
  $bk('tkpop-cancel-overlay').classList.remove('is-open');
  $bk('tkpop-cancel-btn').classList.remove('is-under-confirm');
}

async function tkConfirmCancel() {
  const b = bkState.bookings[tkIndex];
  if (!b || bkBusy) return;
  bkBusy = true;
  try {
    await cancelBooking(b.id);
    await bkRefreshBookings();
  } catch (err) {
    alert(err.message);
    return;
  } finally {
    bkBusy = false;
  }
  tkIndex = -1;
  tkCloseCancel();
  tkRenderTabs();
  tkRenderDetail();
  $bk('tkpop-scrollport').scrollTop = 0;

  bkState.heroIndex = Math.max(0, Math.min(bkState.heroIndex, bkState.bookings.length - 1));
  bkRenderHeroTicket();
  document.querySelector('.hero').classList.toggle('has-ticket', bkState.bookings.length > 0);
}

// Called by main.js once the user is logged in
async function bkLoadBookings() {
  await bkRefreshBookings();
  bkState.lastBooked = bkState.bookings[bkState.bookings.length - 1] || null;
  if (!isMobileDevice()) bkApplyHeroTicket();
}

function bkOnLogout() {
  bkState.bookings = [];
  bkAvail = null;
  bkState.lastBooked = null;
  bkState.heroIndex = 0;
  $bk('hero-ticket-track').innerHTML = '';
  document.querySelector('.hero').classList.remove('has-ticket');
  $bk('bk-select').classList.remove('is-open');
  $bk('bk-info').classList.remove('is-open');
  $bk('ticket-popup').classList.remove('is-open', 'is-closing');
  $bk('ticket-popup').setAttribute('aria-hidden', 'true');
  tkCloseCancel();
  tkIndex = -1;
  tkRenderTabs();
  bkCloseCalendar();
  bkCloseConfirm();
  document.body.style.overflow = '';

  $bk('bkp-select').classList.remove('is-open');
  $bk('bkp-info').classList.remove('is-open');
  bkpCloseCancelPanel();
  $bk('bkp-manage-overlay').classList.remove('is-open', 'is-closing');
  $bk('bkp-manage-overlay').setAttribute('aria-hidden', 'true');
  bkpMgrIndex = -1;
}

/* ============================================================
   MOBILE BOOKING FLOW
============================================================ */

let bkpCalMonth = null;

function bkpOpenSelect() {
  bkpCalMonth = new Date(bkState.date.getFullYear(), bkState.date.getMonth(), 1);
  bkSafetyChecked = false;
  $bk('bkp-safety').classList.remove('is-checked');
  $bk('bkp-book-btn').disabled = true;
  bkpRenderSelect();
  $bk('bkp-select').classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function bkpCloseSelect(reopenPopup) {
  const machine = bkState.machine;
  $bk('bkp-select').classList.remove('is-open');
  document.body.style.overflow = '';
  if (reopenPopup) openMobileMachinePopup(machine);
}

function bkpRenderSelect() {
  const data = bkMachineData[bkState.machine];
  $bk('bkp-select-name').textContent = data.name;
  $bk('bkp-select-photo').src = data.photo;
  bkpRenderCalendar();
  bkpRenderSlots();
  bkpRenderTicket();
}

function bkpRenderCalendar() {
  const d = bkState.date;
  $bk('bkp-chosen-date').textContent =
    `Chosen Date ${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  $bk('bkp-cal-year').textContent = bkpCalMonth.getFullYear();
  $bk('bkp-cal-monthname').textContent = BK_MONTHS[bkpCalMonth.getMonth()];
  const thisMonth = new Date(bkToday().getFullYear(), bkToday().getMonth(), 1);
  $bk('bkp-cal-prev').disabled = bkpCalMonth <= thisMonth;
  const last = bkLastBookable();
  $bk('bkp-cal-next').disabled = bkpCalMonth >= new Date(last.getFullYear(), last.getMonth(), 1);

  const grid = $bk('bkp-cal-grid');
  grid.innerHTML = '';
  const gridStart = bkAddDays(bkpCalMonth, -bkpCalMonth.getDay());
  const rows = Math.ceil((bkpCalMonth.getDay() +
    new Date(bkpCalMonth.getFullYear(), bkpCalMonth.getMonth() + 1, 0).getDate()) / 7);
  for (let i = 0; i < rows * 7; i++) {
    const cellDate = bkAddDays(gridStart, i);
    const btn = document.createElement('button');
    btn.className = 'bkp-cal-day';
    btn.textContent = cellDate.getDate();
    const inMonth = cellDate.getMonth() === bkpCalMonth.getMonth();
    if (!inMonth || !bkIsBookable(cellDate)) {
      btn.disabled = true;
      if (inMonth && bkIsWeekend(cellDate) && cellDate >= bkToday()) btn.classList.add('is-we');
    }
    if (bkSameDay(cellDate, bkState.date)) btn.classList.add('is-selected');
    btn.addEventListener('click', () => bkpSelectDate(cellDate));
    grid.appendChild(btn);
  }
}

function bkpSelectDate(d) {
  bkSetDate(d);
  bkpRenderSelect();
}

function bkpRenderSlots() {
  bkRenderSlotButtons($bk('bkp-slots'), 'bkp-slot');
  const sel = bkSelectedSlots();
  $bk('bkp-chosen-time').textContent =
    'Chosen time: ' + (sel.length ? sel.map(s => s.label).join(', ') : 'none');
  $bk('bkp-book-btn').disabled = !bkSafetyChecked || !sel.length;
}

function bkpRenderTicket() {
  const data = bkMachineData[bkState.machine];
  const d = bkState.date;
  $bk('bkp-ticket-name').textContent = data.name;
  $bk('bkp-ticket-when-label').textContent = bkWhenLabel(d);
  $bk('bkp-ticket-date').textContent = `${BK_MONTHS[d.getMonth()]} ${d.getDate()} (Week ${bkIsoWeek(d)})`;
  $bk('bkp-ticket-section').textContent = bkSectionText(bkSelectedSlots());
}

function bkpToggleSafety() {
  bkSafetyChecked = !bkSafetyChecked;
  $bk('bkp-safety').classList.toggle('is-checked', bkSafetyChecked);
  $bk('bkp-book-btn').disabled = !bkSafetyChecked || !bkSelectedSlots().length;
}

async function bkpSubmitBooking() {
  if (!bkSafetyChecked || !bkSelectedSlots().length || bkBusy) return;
  bkBusy = true;
  $bk('bkp-book-btn').disabled = true;
  try {
    await bkSubmitSelection();
  } catch (err) {
    alert(err.message);
    $bk('bkp-book-btn').disabled = false;
    return;
  } finally {
    bkBusy = false;
  }
  bkpCloseSelect(false);
  bkpOpenInfo();
}

let bkpInfoPage = 1;

function bkpOpenInfo() {
  const b = bkState.lastBooked;
  if (!b) return;
  const data = bkMachineInfo(b);
  $bk('bkp-info-photo').src = data.photo;
  $bk('bkp-info-machine').textContent = data.name;
  $bk('bkp-info-session').textContent = b.label;
  $bk('bkp-info-rel').textContent = bkRelLabel(b.date);
  $bk('bkp-info-date').textContent = bkDayText(b.date);

  bkpShowInfoPage(1);
  $bk('bkp-info').classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function bkpShowInfoPage(page) {
  bkpInfoPage = page;
  $bk('bkp-info-page-1').classList.toggle('is-active', page === 1);
  $bk('bkp-info-page-2').classList.toggle('is-active', page === 2);
}

function bkpInfoContinue() {
  if (bkpInfoPage === 1) { bkpShowInfoPage(2); return; }
  bkpFinishInfo();
}

function bkpFinishInfo() {
  $bk('bkp-info').classList.remove('is-open');
  document.body.style.overflow = '';
  updateMlistCta();
  window.scrollTo({ top: 0 });
}

let bkpMgrIndex = -1;

function bkpOpenManage() {
  bkpMgrIndex = bkState.bookings.length - 1;
  bkpRenderManage();

  const overlay = $bk('bkp-manage-overlay');
  const sheet = $bk('bkp-manage-sheet');
  sheet.style.transition = '';
  sheet.style.transform = '';
  overlay.classList.remove('is-closing');
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function bkpCloseManage() {
  const overlay = $bk('bkp-manage-overlay');
  const sheet = $bk('bkp-manage-sheet');
  sheet.style.transition = '';
  sheet.style.transform = '';
  overlay.classList.add('is-closing');
  overlay.setAttribute('aria-hidden', 'true');
  setTimeout(() => {
    overlay.classList.remove('is-open', 'is-closing');
    document.body.style.overflow = '';
  }, 320);
}

function bkpRenderManage() {
  const n = bkState.bookings.length;
  const body = $bk('bkp-manage-body');
  const empty = $bk('bkp-manage-empty');
  const b = bkState.bookings[bkpMgrIndex];

  body.hidden = !b;
  empty.style.display = b ? 'none' : 'flex';
  $bk('bkp-manage-navrow').hidden = !b;
  if (!b) return;

  $bk('bkp-manage-prev').hidden = bkpMgrIndex <= 0;
  $bk('bkp-manage-next').hidden = bkpMgrIndex >= n - 1;

  const data = bkMachineInfo(b);
  const d = b.date;
  $bk('bkp-manage-title').textContent =
    `${BK_MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()} Time: ${bkSlotStart(b.label)}`;
  $bk('bkp-manage-photo').src = data.photo;
  $bk('bkp-manage-machine').textContent = data.name;
  $bk('bkp-manage-session').textContent = b.label;
  $bk('bkp-manage-rel').textContent = bkRelLabel(d);
  $bk('bkp-manage-date').textContent = bkDayText(d);
  $bk('bkp-manage-cancel-btn').disabled = !b.canCancel;
}

function bkpMgrPrev() {
  if (bkpMgrIndex <= 0) return;
  bkpMgrIndex--;
  bkpRenderManage();
  $bk('bkp-manage-scroll').scrollTop = 0;
}
function bkpMgrNext() {
  if (bkpMgrIndex >= bkState.bookings.length - 1) return;
  bkpMgrIndex++;
  bkpRenderManage();
  $bk('bkp-manage-scroll').scrollTop = 0;
}

function bkpOpenCancelPanel() {
  const b = bkState.bookings[bkpMgrIndex];
  if (!b || !b.canCancel) return;
  $bk('bkp-manage-cancel-machine').textContent = bkMachineInfo(b).name;
  $bk('bkp-manage-cancel-time').textContent = `${bkDayText(b.date)}, ${b.label}`;
  $bk('bkp-manage-cancel-overlay').classList.add('is-open');
}

function bkpCloseCancelPanel() {
  $bk('bkp-manage-cancel-overlay').classList.remove('is-open');
}

async function bkpConfirmCancel() {
  const b = bkState.bookings[bkpMgrIndex];
  if (!b || bkBusy) return;
  bkBusy = true;
  try {
    await cancelBooking(b.id);
    await bkRefreshBookings();
  } catch (err) {
    alert(err.message);
    return;
  } finally {
    bkBusy = false;
  }
  bkpMgrIndex = Math.max(0, Math.min(bkpMgrIndex, bkState.bookings.length - 1));
  bkpCloseCancelPanel();
  bkpRenderManage();
  $bk('bkp-manage-scroll').scrollTop = 0;
  updateMlistCta();
  if (!bkState.bookings.length) bkpCloseManage();
}

$bk('bkp-select-close').addEventListener('click', () => bkpCloseSelect(true));
$bk('bkp-cal-prev').addEventListener('click', () => {
  bkpCalMonth = new Date(bkpCalMonth.getFullYear(), bkpCalMonth.getMonth() - 1, 1);
  bkpRenderCalendar();
});
$bk('bkp-cal-next').addEventListener('click', () => {
  bkpCalMonth = new Date(bkpCalMonth.getFullYear(), bkpCalMonth.getMonth() + 1, 1);
  bkpRenderCalendar();
});
$bk('bkp-safety').addEventListener('click', bkpToggleSafety);
$bk('bkp-book-btn').addEventListener('click', bkpSubmitBooking);
$bk('bkp-info-continue-1').addEventListener('click', bkpInfoContinue);
$bk('bkp-info-continue-2').addEventListener('click', bkpInfoContinue);

$bk('bkp-manage-prev').addEventListener('click', bkpMgrPrev);
$bk('bkp-manage-next').addEventListener('click', bkpMgrNext);
$bk('bkp-manage-cancel-btn').addEventListener('click', bkpOpenCancelPanel);
$bk('bkp-manage-cancel-confirm').addEventListener('click', bkpConfirmCancel);
$bk('bkp-manage-cancel-return').addEventListener('click', bkpCloseCancelPanel);

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if ($bk('bkp-manage-cancel-overlay').classList.contains('is-open')) bkpCloseCancelPanel();
  else if ($bk('bkp-manage-overlay').classList.contains('is-open')) bkpCloseManage();
});

// Close phone overlays and unlock body scroll if resized to desktop width
window.addEventListener('resize', () => {
  if (window.innerWidth <= 700) return;
  $bk('bkp-select').classList.remove('is-open');
  $bk('bkp-info').classList.remove('is-open');
  bkpCloseCancelPanel();
  if ($bk('bkp-manage-overlay').classList.contains('is-open')) {
    $bk('bkp-manage-overlay').classList.remove('is-open', 'is-closing');
    $bk('bkp-manage-overlay').setAttribute('aria-hidden', 'true');
  }
  if ($bk('machine-popup-mobile').classList.contains('is-open')) {
    closeMobileMachinePopup();
  }
  document.body.style.overflow = '';
});

/* ============================================================
   WIRING
============================================================ */

$bk('bk-back').addEventListener('click', () => bkCloseSelect(true));
$bk('bk-week-prev').addEventListener('click', () => {
  bkWeekStart = bkAddDays(bkWeekStart, -7);
  const first = bkFirstBookable(new Date(Math.max(bkWeekStart, bkToday())));
  if (first && bkSameDay(bkMonday(first), bkWeekStart)) bkSetDate(first);
  bkRenderSelect();
});
$bk('bk-week-next').addEventListener('click', () => {
  bkWeekStart = bkAddDays(bkWeekStart, 7);
  const first = bkFirstBookable(bkWeekStart);
  if (first && bkSameDay(bkMonday(first), bkWeekStart)) bkSetDate(first);
  bkRenderSelect();
});
$bk('bk-viewmonth').addEventListener('click', bkOpenCalendar);
$bk('bk-book-btn').addEventListener('click', bkOpenConfirm);

$bk('bk-cal-close').addEventListener('click', bkCloseCalendar);
$bk('bk-cal-confirm').addEventListener('click', bkConfirmCalendar);
$bk('bk-cal-prev').addEventListener('click', () => {
  bkCalMonth = new Date(bkCalMonth.getFullYear(), bkCalMonth.getMonth() - 1, 1);
  bkRenderCalendar();
});
$bk('bk-cal-next').addEventListener('click', () => {
  bkCalMonth = new Date(bkCalMonth.getFullYear(), bkCalMonth.getMonth() + 1, 1);
  bkRenderCalendar();
});
$bk('bk-cal-overlay').addEventListener('click', function (e) {
  if (e.target === this) bkCloseCalendar();
});

$bk('bk-safety').addEventListener('click', bkToggleSafety);
$bk('bk-confirm-btn').addEventListener('click', bkConfirmBooking);
$bk('bk-cancel-btn').addEventListener('click', bkCloseConfirm);
$bk('bk-confirm-overlay').addEventListener('click', function (e) {
  if (e.target === this) bkCloseConfirm();
});

$bk('bk-skip').addEventListener('click', bkFinish);
$bk('bk-continue').addEventListener('click', bkInfoContinue);
document.querySelectorAll('.bk-return').forEach(btn => {
  btn.addEventListener('click', () => bkShowInfoPage(btn.dataset.goto));
});
document.querySelectorAll('.bk-dot').forEach(dot => {
  dot.addEventListener('click', () => bkShowInfoPage(dot.dataset.page));
});

$bk('hero-ticket-prev').addEventListener('click', () => bkHeroGoTo(bkState.heroIndex - 1));
$bk('hero-ticket-next').addEventListener('click', () => bkHeroGoTo(bkState.heroIndex + 1));
$bk('hero-ticket-track').addEventListener('click', e => {
  const btn = e.target.closest('.hero-ticket__more');
  if (!btn) return;
  const i = Number(btn.dataset.index);
  if (bkState.bookings[i]) openTicketPopup(i);
});

$bk('tkpop-close').addEventListener('click', closeTicketPopup);
$bk('ticket-popup').addEventListener('click', function (e) {
  if (e.target === this) closeTicketPopup();
});
$bk('tkpop-tabs').addEventListener('click', e => {
  const tab = e.target.closest('.tkpop-tab');
  if (!tab) return;
  tkIndex = Number(tab.dataset.index);
  tkSetActiveTab();
  tkRenderDetail();
  $bk('tkpop-scrollport').scrollTop = 0;
});
$bk('tkpop-cancel-btn').addEventListener('click', tkOpenCancel);
$bk('tkpop-cancel-confirm').addEventListener('click', tkConfirmCancel);
$bk('tkpop-cancel-return').addEventListener('click', tkCloseCancel);
$bk('tkpop-cancel-overlay').addEventListener('click', function (e) {
  if (e.target === this) tkCloseCancel();
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if ($bk('bk-cal-overlay').classList.contains('is-open')) bkCloseCalendar();
  else if ($bk('bk-confirm-overlay').classList.contains('is-open')) bkCloseConfirm();
  else if ($bk('tkpop-cancel-overlay').classList.contains('is-open')) tkCloseCancel();
  else if ($bk('ticket-popup').classList.contains('is-open')) closeTicketPopup();
});

export { bkState, bkOnLogout, bkLoadBookings, bkpCloseCancelPanel, bkpCloseManage, bkpOpenManage, openBookingFlow };
