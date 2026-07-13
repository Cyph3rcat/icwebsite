/* ============================================================
   BOOKING FLOW (Bambu X1) — see CLAUDE.md "Booking flow" section
   Requires main.js (LoggedIn, closeMachinePopup, openMachinePopup).
============================================================ */

/* ---------- Machine data (extend here to add machines) ---------- */
const bkMachineData = {
  bambu: {
    name: 'Bambu X1 Carbon',
    venue: 'W503',
    photo: 'assets/booking/booking_photo.jpg',
  },
};

/* ---------- Date helpers ---------- */
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
/* "Next Monday" / "Tomorrow" style label */
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

/* ---------- Slot model ----------
   Six fixed 1-hour slots; 15:00/16:00 kept unavailable to match the
   design. Selection is a contiguous run of available hours. */
const BK_SLOT_HOURS = [9, 10, 11, 14, 15, 16];
const BK_AVAILABLE = { 9: true, 10: true, 11: true, 14: true, 15: false, 16: false };

/* ---------- State ---------- */
const bkState = {
  machine: 'bambu',
  date: null,          // selected Date
  hours: [9],          // selected start hours (contiguous)
  bookings: [],         // [{ machine, date, hours }, ...] all confirmed sessions
  lastBooked: null,     // the booking the info wizard is currently walking through
  heroIndex: 0,          // which hero-ticket slide is showing
};
let bkWeekStart = null; // Monday of the week shown in the strip
let bkCalMonth = null;  // first day of month shown in calendar
let bkCalPick = null;   // tentative date inside calendar popup
let bkInfoPage = 'a';

/* ---------- Element shortcuts ---------- */
const $bk = id => document.getElementById(id);

/* ============================================================
   SELECT SECTION VIEW
============================================================ */

function openBookingFlow(machineKey) {
  if (!bkMachineData[machineKey]) return;
  bkState.machine = machineKey;
  bkState.date = bkFirstBookable(bkToday());
  bkState.hours = [BK_SLOT_HOURS.find(h => BK_AVAILABLE[h])];
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
    btn.addEventListener('click', () => bkToggleHour(h));
    wrap.appendChild(btn);
  });

  const start = Math.min(...bkState.hours), end = Math.max(...bkState.hours) + 1;
  $bk('bk-selected-time').textContent = `${start}:00 - ${end}:00`;
  $bk('bk-selected-dur').textContent =
    `${bkState.hours.length} Hour${bkState.hours.length > 1 ? 's' : ''} Section`;
}

/* Contiguous multi-select: click adjacent hour to extend, click an
   endpoint to shrink, click anything else to restart from that hour. */
function bkToggleHour(h) {
  const sel = bkState.hours.slice().sort((a, b) => a - b);
  const min = sel[0], max = sel[sel.length - 1];
  if (sel.includes(h)) {
    if (sel.length > 1 && (h === min || h === max)) {
      bkState.hours = sel.filter(x => x !== h);
    } else {
      bkState.hours = [h];
    }
  } else if (h === max + 1 || h === min - 1) {
    bkState.hours = sel.concat(h);
  } else {
    bkState.hours = [h];
  }
  bkRenderSlots();
  bkRenderTicket();
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
  const gridStart = bkAddDays(bkCalMonth, -bkCalMonth.getDay()); // back to Sunday
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

function bkConfirmBooking() {
  if (!bkSafetyChecked) return;
  const booking = {
    machine: bkState.machine,
    date: new Date(bkState.date),
    hours: bkState.hours.slice(),
  };
  bkState.bookings.push(booking);
  bkState.lastBooked = booking;
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
        <div class="hero-ticket__when">
          <span>${bkWhenLabel(d)}</span>
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

let tkIndex = -1; // index into bkState.bookings currently shown (-1 = none/empty state)

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

/* Switching tabs (mpop-tab logic): toggle is-active on the existing buttons
   rather than rebuilding them, so the indicator slides from its current
   position instead of resetting to 0 and animating in from the left. */
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

/* Floats the confirm panel above the cancel button, left-edge aligned, with
   the button's top tucked under the panel so its square bottom-left corner
   runs continuously into the button. Overlap is 18 of the button's 65.7
   height — the button's under-confirm corner radius (see is-under-confirm) —
   so the seam sits exactly where the top-left curve ends and the left edge
   stays dead straight (Figma's nominal 15.3 leaves a sliver of curve
   exposed). Measure the button only after is-under-confirm lands on it: that
   kills any in-flight hover scale so the rect is true. */
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

/* Confirm cancel: drop the booking, keep the popup open showing the
   empty state (893:5785); remaining tickets stay reachable via tabs. */
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

  // Sync hero carousel
  bkState.heroIndex = Math.max(0, Math.min(bkState.heroIndex, bkState.bookings.length - 1));
  bkRenderHeroTicket();
  document.querySelector('.hero').classList.toggle('has-ticket', bkState.bookings.length > 0);
}

/* Called from main.js on logout: drop all bookings, restore hero */
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
  bkCloseCalendar();
  bkCloseConfirm();
  document.body.style.overflow = '';
}

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

/* Ticket detail popup */
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
