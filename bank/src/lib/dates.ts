/**
 * Dates are stored as epoch milliseconds and grouped by the phone's local day and month.
 * Labels are built by hand (not Intl) so they read the same on iOS, Android and web.
 */
export const DAY = 86_400_000;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day, "2026-10-17". */
export function dayKey(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** Local calendar month, "2026-10". */
export function monthKey(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
/** Midnight at the start of a "YYYY-MM-DD" day. */
export function dayStart(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}
/** Midnight at the start of a "YYYY-MM" month. */
export function monthStart(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).getTime();
}
export function addMonths(key: string, n: number) {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + n, 1).getTime());
}
export function daysInMonth(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
/** Day of the month a timestamp falls on, 1–31. */
export const dateOf = (ms: number) => new Date(ms).getDate();

/** "October 2026", or "Oct" with short. */
export function monthLabel(key: string, short?: boolean) {
  const [y, m] = key.split('-').map(Number);
  return short ? MONTHS[m - 1].slice(0, 3) : `${MONTHS[m - 1]} ${y}`;
}

/** "Today", "Yesterday", "Tomorrow", "Monday, 13 October" (adds the year when it isn't this year). */
export function dayLabel(key: string, now = Date.now()) {
  const today = dayKey(now);
  if (key === today) return 'Today';
  if (key === dayKey(startOfDay(now) - DAY / 2)) return 'Yesterday';
  if (key === dayKey(startOfDay(now) + DAY * 1.5)) return 'Tomorrow';
  const d = new Date(dayStart(key));
  const label = `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date(now).getFullYear() ? label : `${label} ${d.getFullYear()}`;
}

/** "3:42 PM" */
export function timeLabel(ms: number) {
  const d = new Date(ms);
  const h = d.getHours() % 12 || 12;
  return `${h}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/** "13 Oct 2026, 3:42 PM" */
export function dateTimeLabel(ms: number) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}, ${timeLabel(ms)}`;
}

/** "13 Oct" */
export function shortDate(ms: number) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** 10:00 AM on the next weekday — when a PESONet transfer lands. Public holidays aren't modelled. */
export function nextBankingDay(ms: number) {
  const d = new Date(startOfDay(ms));
  do d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6);
  d.setHours(10, 0, 0, 0);
  return d.getTime();
}

/** "Good morning" until noon, "Good afternoon" until 6 PM, then "Good evening". */
export function greeting(ms = Date.now()) {
  const h = new Date(ms).getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
