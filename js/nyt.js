// Parse and validate an imported puzzle payload (produced by the bookmarklet).
// Format: v1;d:2026-10-24;c:a;o:bdeglm;p:gambled,...;w:able,abed,...

import { letterMask } from './wordlist.js';

export function buildPayload({ printDate, center, outer, pangrams, answers }) {
  return [
    'v1',
    `d:${printDate}`,
    `c:${center}`,
    `o:${outer.join('')}`,
    `p:${pangrams.join(',')}`,
    `w:${answers.join(',')}`,
  ].join(';');
}

export function parsePayload(text) {
  let s = String(text || '').trim();
  const hashAt = s.indexOf('nyt=');
  if (hashAt >= 0) s = s.slice(hashAt + 4);
  try { s = decodeURIComponent(s); } catch { /* already plain */ }
  const parts = s.split(';');
  if (parts[0] !== 'v1') return null;
  const fields = {};
  for (const p of parts.slice(1)) {
    const i = p.indexOf(':');
    if (i > 0) fields[p.slice(0, i)] = p.slice(i + 1);
  }
  const list = (v) => (v ? v.split(',').map((w) => w.trim()).filter(Boolean) : []);
  return {
    version: 'v1',
    printDate: fields.d || '',
    center: fields.c || '',
    outer: (fields.o || '').split(''),
    pangrams: list(fields.p),
    answers: list(fields.w),
  };
}

// Returns { ok: true, puzzle } or { ok: false, reason }.
export function validatePayload(p) {
  const bad = (reason) => ({ ok: false, reason });
  if (!p || p.version !== 'v1') return bad('version');
  if (!/^[a-z]$/.test(p.center)) return bad('center');
  if (p.outer.length !== 6 || !p.outer.every((c) => /^[a-z]$/.test(c))) return bad('outer');
  const letters = [p.center, ...p.outer];
  if (new Set(letters).size !== 7) return bad('letters');
  if (p.printDate && !/^\d{4}-\d{2}-\d{2}$/.test(p.printDate)) return bad('date');
  if (p.answers.length === 0) return bad('answers');
  const allowed = letterMask(letters.join(''));
  const centerBit = letterMask(p.center);
  for (const w of p.answers) {
    if (!/^[a-z]{4,}$/.test(w)) return bad('answer-format');
    const m = letterMask(w);
    if (m & ~allowed) return bad('answer-letters');
    if (!(m & centerBit)) return bad('answer-center');
  }
  if (p.pangrams.length === 0) return bad('no-pangram');
  const answerSet = new Set(p.answers);
  for (const w of p.pangrams) {
    if (letterMask(w) !== allowed) return bad('pangram-letters');
    if (!answerSet.has(w)) return bad('pangram-missing');
  }
  return {
    ok: true,
    puzzle: {
      printDate: p.printDate,
      center: p.center,
      outer: [...p.outer],
      pangrams: [...new Set(p.pangrams)].sort(),
      answers: [...answerSet].sort(),
    },
  };
}

export const INVALID_MESSAGE = "This doesn't look like a valid puzzle — the NYT page format may have changed.";
