// localStorage / sessionStorage helpers. Every access is wrapped: the app must
// still work (just without persistence) when storage is unavailable.

import { STORAGE_PREFIX } from './config.js';

function store(kind) {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function getJSON(key, fallback = null, kind = 'local') {
  try {
    const raw = store(kind)?.getItem(STORAGE_PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setJSON(key, value, kind = 'local') {
  try {
    store(kind)?.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key, kind = 'local') {
  try {
    store(kind)?.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* ignore */
  }
}
