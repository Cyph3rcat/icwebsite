import {
  LoggedIn, isMobileDevice, openMachinePopup, closeMachinePopup,
  openMobileMachinePopup, closeMobileMachinePopup, updateMlistCta,
} from './main.js';

const bkMachineData = {
  bambu: {
    name: 'Bambu X1 Carbon',
    venue: 'W503',
    photo: 'assets/booking/booking_photo.jpg',
  },
};

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
function bkIsBookable(d) { return !bkIsWeekend(d) && d >= bkToday(); }
function bkFirstBookable(from) {
  let d = new Date(from);
  while (!bkIsBookable(d)) d = bkAddDays(d, 1);
  return d;
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
function bkSectionText(hours) {
  const start = Math.min(...hours), end = Math.max(...hours) + 1, n = hours.length;
  return `${start}:00 - ${end}:00 (${n} hour${n > 1 ? 's' : ''})`;
}

const BK_SLOT_HOURS = [9, 10, 11, 14, 15, 16];
const BK_AVAILABLE = { 9: true, 10: true, 11: true, 14: true, 15: false, 16: false };
const BK_MAX_HOURS = 3;

const bkState = {
  machine: 'bambu',
  date: null,
  hours: [9], // contiguous start hours
  bookings: [], // { machine, date, hours }
  lastBooked: null,
  heroIndex: 0,
};
let bkWeekStart = null;
let bkCalMonth = null;
let bkCalPick = null;
let bkInfoPage = 'a';

const $bk = id => document.getElementById(id);

/* ============================================================
   SELECT SECTION VIEW
============================================================ */

function openBookingFlow(machineKey) {
  if (!bkMachineData[machineKey]) return;
  bkState.machine = machineKey;
  bkState.date = bkFirstBookable(bkToday());
  bkState.hours = [BK_SLOT_HOURS.find(h => BK_AVAILABLE[h])];
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
      bkState.date = d;
      bkRenderSelect();
    });
    days.appendChild(btn);
  }
}

function bkRenderSlots() {
  const wrap = $bk('bk-slots');
  wrap.innerHTML = '';
  BK_SLOT_HOURS.forEach(h => {
    const btn = document.createElement('button');
    btn.className = 'bk-slot';
    btn.innerHTML = `<span class="t">${h}:00</span><span class="d">(1 Hour)</span>`;
    if (!BK_AVAILABLE[h]) btn.disabled = true;
    if (bkState.hours.includes(h)) btn.classList.add('is-selected');
    btn.addEventListener('click', () => bkToggleHour(h, btn));
    wrap.appendChild(btn);
  });

  const start = Math.min(...bkState.hours), end = Math.max(...bkState.hours) + 1;
  $bk('bk-selected-time').textContent = `${start}:00 - ${end}:00`;
  $bk('bk-selected-dur').textContent =
    `${bkState.hours.length} Hour${bkState.hours.length > 1 ? 's' : ''} Section`;
}

// Adjacent click extends, endpoint click shrinks, anything else restarts
function bkToggleHour(h, btn) {
  const sel = bkState.hours.slice().sort((a, b) => a - b);
  const min = sel[0], max = sel[sel.length - 1];
  if (sel.includes(h)) {
    if (sel.length > 1 && (h === min || h === max)) {
      bkState.hours = sel.filter(x => x !== h);
    } else {
      bkState.hours = [h];
    }
  } else if (sel.length >= BK_MAX_HOURS) {
    bkFlashMaxHours(btn);
    return;
  } else if (h === max + 1 || h === min - 1) {
    bkState.hours = sel.concat(h);
  } else {
    bkState.hours = [h];
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
  $bk('bk-ticket-section').textContent = bkSectionText(bkState.hours);
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
  bkState.date = bkCalPick;
  bkWeekStart = bkMonday(bkCalPick);
  bkRenderSelect();
  bkCloseCalendar();
}

/* ============================================================
   CONFIRM BOOKING OVERLAY
============================================================ */

let bkSafetyChecked = false;

function bkOpenConfirm() {
  bkSafetyChecked = false;
  $bk('bk-safety').classList.remove('is-checked');
  $bk('bk-confirm-btn').classList.remove('is-enabled');
  const d = bkState.date;
  $bk('bk-confirm-name').textContent = bkMachineData[bkState.machine].name;
  $bk('bk-confirm-when').textContent = bkWhenLabel(d);
  $bk('bk-confirm-section').textContent = bkSectionText(bkState.hours);
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

function bkCommitBooking() {
  const booking = {
    machine: bkState.machine,
    date: new Date(bkState.date),
    hours: bkState.hours.slice(),
  };
  bkState.bookings.push(booking);
  bkState.lastBooked = booking;
  return booking;
}

function bkConfirmBooking() {
  if (!bkSafetyChecked) return;
  bkCommitBooking();
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
  const start = Math.min(...b.hours), end = Math.max(...b.hours) + 1;
  $bk('bk-info-machine').textContent = bkMachineData[b.machine].name;
  $bk('bk-visit-rel').textContent = bkRelLabel(d);
  $bk('bk-visit-date').textContent =
    `${BK_MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()} ${BK_DOW_FULL[d.getDay()]}`;
  $bk('bk-session-total').textContent =
    `Total ${b.hours.length} Hour${b.hours.length > 1 ? 's' : ''}`;
  $bk('bk-session-time').textContent = `${start}:00 - ${end}:00`;

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
        <p class="hero-ticket__name">${bkMachineData[b.machine].name}</p>
        <div class="hero-ticket__meta">
          <div>
            <p class="l">Date</p>
            <p class="v">${BK_MONTHS[d.getMonth()]} ${d.getDate()}</p>
          </div>
          <div>
            <p class="l">Section</p>
            <p class="v">${bkSectionText(b.hours)}</p>
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
  bkState.heroIndex = bkState.bookings.length - 1;
  bkRenderHeroTicket();
  document.querySelector('.hero').classList.add('has-ticket');
}

/* ============================================================
   TICKET DETAIL POPUP (hero ticket "More" -> cancel booking)
============================================================ */

let tkIndex = -1; // -1 = empty state

function tkTabLabel(b) {
  const start = Math.min(...b.hours);
  return `${BK_MONTHS[b.date.getMonth()].slice(0, 3)} ${b.date.getDate()} Time: ${start}:00`;
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
  const data = bkMachineData[b.machine];
  const d = b.date;
  const start = Math.min(...b.hours), end = Math.max(...b.hours) + 1;
  $bk('tkpop-photo').src = data.photo;
  $bk('tkpop-machine').textContent = data.name;
  $bk('tkpop-venue-code').textContent = data.venue;
  $bk('tkpop-visit-rel').textContent = bkRelLabel(d);
  $bk('tkpop-visit-date').textContent =
    `${BK_MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()} ${BK_DOW_FULL[d.getDay()]}`;
  $bk('tkpop-session-total').textContent =
    `Total ${b.hours.length} Hour${b.hours.length > 1 ? 's' : ''}`;
  $bk('tkpop-session-time').textContent = `${start}:00 - ${end}:00`;
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
  if (!b) return;
  const d = b.date;
  const start = Math.min(...b.hours), end = Math.max(...b.hours) + 1;
  $bk('tkpop-cancel-machine').textContent = bkMachineData[b.machine].name;
  $bk('tkpop-cancel-date').textContent =
    `${BK_MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()} ${BK_DOW_FULL[d.getDay()]}`;
  $bk('tkpop-cancel-time').textContent = `${start}:00 - ${end}:00`;
  $bk('tkpop-cancel-btn').classList.add('is-under-confirm');
  tkPositionCancelPanel();
  $bk('tkpop-cancel-overlay').classList.add('is-open');
}

function tkCloseCancel() {
  $bk('tkpop-cancel-overlay').classList.remove('is-open');
  $bk('tkpop-cancel-btn').classList.remove('is-under-confirm');
}

function tkConfirmCancel() {
  const removed = bkState.bookings.splice(tkIndex, 1)[0];
  if (bkState.lastBooked === removed) {
    bkState.lastBooked = bkState.bookings[bkState.bookings.length - 1] || null;
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

function bkOnLogout() {
  bkState.bookings = [];
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
  bkState.date = d;
  bkState.hours = [BK_SLOT_HOURS.find(h => BK_AVAILABLE[h])];
  bkpRenderSelect();
}

function bkpRenderSlots() {
  const wrap = $bk('bkp-slots');
  wrap.innerHTML = '';
  BK_SLOT_HOURS.forEach(h => {
    const btn = document.createElement('button');
    btn.className = 'bkp-slot';
    btn.innerHTML = `<span class="t">${h}:00</span><span class="d">(1 Hour)</span>`;
    if (!BK_AVAILABLE[h]) btn.disabled = true;
    if (bkState.hours.includes(h)) btn.classList.add('is-selected');
    btn.addEventListener('click', () => bkToggleHour(h, btn));
    wrap.appendChild(btn);
  });
  $bk('bkp-chosen-time').textContent =
    'Chosen time: ' + bkState.hours.map(h => `${h}:00`).join(', ');
}

function bkpRenderTicket() {
  const data = bkMachineData[bkState.machine];
  const d = bkState.date;
  $bk('bkp-ticket-name').textContent = data.name;
  $bk('bkp-ticket-when-label').textContent = bkWhenLabel(d);
  $bk('bkp-ticket-date').textContent = `${BK_MONTHS[d.getMonth()]} ${d.getDate()} (Week ${bkIsoWeek(d)})`;
  $bk('bkp-ticket-section').textContent = bkSectionText(bkState.hours);
}

function bkpToggleSafety() {
  bkSafetyChecked = !bkSafetyChecked;
  $bk('bkp-safety').classList.toggle('is-checked', bkSafetyChecked);
  $bk('bkp-book-btn').disabled = !bkSafetyChecked;
}

function bkpSubmitBooking() {
  if (!bkSafetyChecked) return;
  bkCommitBooking();
  bkpCloseSelect(false);
  bkpOpenInfo();
}

let bkpInfoPage = 1;

function bkpOpenInfo() {
  const b = bkState.lastBooked;
  if (!b) return;
  const data = bkMachineData[b.machine];
  const d = b.date;
  const start = Math.min(...b.hours), end = Math.max(...b.hours) + 1;
  $bk('bkp-info-photo').src = data.photo;
  $bk('bkp-info-machine').textContent = data.name;
  $bk('bkp-info-session').textContent = `${start}:00 - ${end}:00`;
  $bk('bkp-info-rel').textContent = bkRelLabel(d);
  $bk('bkp-info-date').textContent = `${BK_MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()} ${BK_DOW_FULL[d.getDay()]}`;

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

  const data = bkMachineData[b.machine];
  const d = b.date;
  const start = Math.min(...b.hours), end = Math.max(...b.hours) + 1;
  $bk('bkp-manage-title').textContent =
    `${BK_MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()} Time: ${start}:00`;
  $bk('bkp-manage-photo').src = data.photo;
  $bk('bkp-manage-machine').textContent = data.name;
  $bk('bkp-manage-session').textContent = `${start}:00 - ${end}:00`;
  $bk('bkp-manage-rel').textContent = bkRelLabel(d);
  $bk('bkp-manage-date').textContent = `${BK_MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()} ${BK_DOW_FULL[d.getDay()]}`;
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
  if (!b) return;
  const data = bkMachineData[b.machine];
  const d = b.date;
  const start = Math.min(...b.hours), end = Math.max(...b.hours) + 1;
  $bk('bkp-manage-cancel-machine').textContent = data.name;
  $bk('bkp-manage-cancel-time').textContent =
    `${BK_MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()} ${BK_DOW_FULL[d.getDay()]}, ${start}:00 - ${end}:00`;
  $bk('bkp-manage-cancel-overlay').classList.add('is-open');
}

function bkpCloseCancelPanel() {
  $bk('bkp-manage-cancel-overlay').classList.remove('is-open');
}

function bkpConfirmCancel() {
  const removed = bkState.bookings.splice(bkpMgrIndex, 1)[0];
  if (bkState.lastBooked === removed) {
    bkState.lastBooked = bkState.bookings[bkState.bookings.length - 1] || null;
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
  if (!bkSameDay(bkMonday(bkState.date), bkWeekStart)) bkState.date = first;
  bkRenderSelect();
});
$bk('bk-week-next').addEventListener('click', () => {
  bkWeekStart = bkAddDays(bkWeekStart, 7);
  if (!bkSameDay(bkMonday(bkState.date), bkWeekStart)) bkState.date = bkFirstBookable(bkWeekStart);
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

export { bkState, bkOnLogout, bkpCloseCancelPanel, bkpCloseManage, bkpOpenManage, openBookingFlow };
