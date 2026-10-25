import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { buildPayload, parsePayload, validatePayload } from '../js/nyt.js';
import { bookmarkletSource, bookmarkletHref } from '../js/bookmarklet.js';

const good = {
  printDate: '2026-10-24',
  center: 'a',
  outer: ['b', 'd', 'e', 'g', 'l', 'm'],
  pangrams: ['gambled'],
  answers: ['abed', 'able', 'amble', 'gambled'],
};

test('payload round-trips', () => {
  const s = buildPayload(good);
  assert.equal(s, 'v1;d:2026-10-24;c:a;o:bdeglm;p:gambled;w:abed,able,amble,gambled');
  const r = validatePayload(parsePayload(s));
  assert.ok(r.ok);
  assert.deepEqual(r.puzzle, good);
  // Accepts a full URL / hash and percent-encoding.
  assert.ok(validatePayload(parsePayload(`https://x.github.io/g/#nyt=${encodeURIComponent(s)}`)).ok);
});

test('malformed payloads are rejected', () => {
  const bad = (patch) => validatePayload(parsePayload(buildPayload({ ...good, ...patch })));
  assert.equal(validatePayload(parsePayload('v2;c:a')).ok, false);
  assert.equal(validatePayload(parsePayload('garbage')).ok, false);
  assert.equal(validatePayload(parsePayload('')).ok, false);
  assert.equal(bad({ center: 'ab' }).reason, 'center');
  assert.equal(bad({ outer: ['b', 'd', 'e', 'g', 'l'] }).reason, 'outer');
  assert.equal(bad({ outer: ['b', 'd', 'e', 'g', 'l', 'a'] }).reason, 'letters');
  assert.equal(bad({ answers: [] }).reason, 'answers');
  assert.equal(bad({ answers: ['abe', 'gambled'] }).reason, 'answer-format');
  assert.equal(bad({ answers: ['ablz', 'gambled'] }).reason, 'answer-letters');
  assert.equal(bad({ answers: ['bled', 'gambled'] }).reason, 'answer-center');
  assert.equal(bad({ pangrams: [] }).reason, 'no-pangram');
  assert.equal(bad({ pangrams: ['amble'] }).reason, 'pangram-letters');
  assert.equal(bad({ pangrams: ['gambled'], answers: ['able'] }).reason, 'pangram-missing');
  assert.equal(bad({ printDate: '10/24/2026' }).reason, 'date');
});

test('bookmarklet code is bookmark-safe and parses', () => {
  const src = bookmarkletSource('https://me.github.io/buzz-off/');
  assert.ok(!src.includes('#'), 'no literal #');
  assert.ok(!src.includes('%'), 'no literal %');
  assert.ok(!src.includes('\n'));
  assert.doesNotThrow(() => new vm.Script(src));
  assert.ok(bookmarkletHref('https://a/b').startsWith('javascript:(function(){'));
  assert.ok(!bookmarkletSource('https://a/b%20c#x').includes('%'));
});

function runBookmarklet(windowExtras, scripts = []) {
  const opened = [];
  const ctx = {
    alerts: [],
    location: { href: '' },
    navigator: {},
    document: {
      getElementsByTagName: () => scripts.map((t) => ({ textContent: t })),
      getElementById: () => null,
      createElement: () => ({ style: {}, appendChild() {}, remove() {} }),
      body: { appendChild() {} },
    },
  };
  ctx.window = { ...windowExtras, open: (u) => { opened.push(u); return {}; } };
  ctx.alert = (m) => ctx.alerts.push(m);
  vm.runInNewContext(bookmarkletSource('https://me.github.io/buzz-off/'), ctx);
  return { opened, alerts: ctx.alerts };
}

const today = {
  printDate: '2026-10-24', centerLetter: 'a', outerLetters: ['b', 'd', 'e', 'g', 'l', 'm'],
  validLetters: ['a', 'b', 'd', 'e', 'g', 'l', 'm'], pangrams: ['gambled'], answers: ['abed', 'able', 'amble', 'gambled'],
};

test('bookmarklet reads window.gameData and opens the game', () => {
  const { opened, alerts } = runBookmarklet({ gameData: { today } });
  assert.equal(alerts.length, 0);
  assert.equal(opened.length, 1);
  const [base, payload] = opened[0].split('#nyt=');
  assert.equal(base, 'https://me.github.io/buzz-off/');
  assert.ok(validatePayload(parsePayload(payload)).ok);
});

test('bookmarklet falls back to parsing the script tag', () => {
  const script = `window.gameData = ${JSON.stringify({ today, yesterday: { note: "a } brace 'in' a string" } })}`;
  const { opened } = runBookmarklet({}, ['var x = 1;', script]);
  assert.equal(opened.length, 1);
  assert.ok(validatePayload(parsePayload(opened[0])).ok);
});

test('bookmarklet alerts when not on the puzzle page', () => {
  const { opened, alerts } = runBookmarklet({});
  assert.equal(opened.length, 0);
  assert.equal(alerts.length, 1);
});
