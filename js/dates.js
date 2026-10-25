// Day keys (YYYY-MM-DD) in a given IANA timezone.

import { EPOCH_DAY } from './config.js';

const DAY_MS = 86400000;

export function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

// Calendar date of `date` in `timeZone` (device local if omitted).
export function dayKey(date = new Date(), timeZone) {
  const opts = { year: 'numeric', month: '2-digit', day: '2-digit' };
  if (timeZone) opts.timeZone = timeZone;
  const parts = new Intl.DateTimeFormat('en-CA', opts).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function keyToUtc(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isDayKey(key) {
  return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key);
}

export function dayIndex(key) {
  return Math.round((keyToUtc(key) - keyToUtc(EPOCH_DAY)) / DAY_MS);
}

export function addDays(key, n) {
  const d = new Date(keyToUtc(key) + n * DAY_MS);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  return Math.round((keyToUtc(b) - keyToUtc(a)) / DAY_MS);
}

// 0 = Sunday
export function weekday(key) {
  return new Date(keyToUtc(key)).getUTCDay();
}

export function formatLongDate(key) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(keyToUtc(key)));
}
