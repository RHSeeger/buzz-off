// Bottom toasts (achievements, updates, notices) and the in-game message bubble.

import { h } from './dom.js';

// Timed toasts are queued and shown one at a time so they never pile up over
// the hive. Sticky toasts (duration 0, e.g. "Update available") show at once.
const queue = [];
let busy = false;

export function showToast(content, { duration = 3500, action = null, className = '' } = {}) {
  let el = null;
  let done = false;
  const dismiss = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (!el) { queue.splice(queue.indexOf(item), 1); return; }
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
    if (duration) setTimeout(next, 250);
  };
  let timer = null;
  const item = () => {
    el = h('div', { class: `toast ${className}`, role: 'status' }, content,
      action && h('button', { class: 'toast-action', type: 'button', onclick: () => { action.onClick(); dismiss(); } }, action.label));
    document.getElementById('toasts').append(el);
    requestAnimationFrame(() => el.classList.add('show'));
    if (duration) timer = setTimeout(dismiss, duration);
  };
  if (!duration) item();
  else { queue.push(item); if (!busy) next(); }
  return dismiss;
}

function next() {
  const item = queue.shift();
  busy = !!item;
  if (item) item();
}

let msgTimer = null;

// kind: 'error' | 'praise' | 'pangram'
export function flashMessage(text, kind = 'error', points = null) {
  const root = document.getElementById('message');
  clearTimeout(msgTimer);
  root.replaceChildren(
    h('span', { class: `msg msg-${kind}` }, text),
    points != null ? h('span', { class: 'msg-points' }, `+${points}`) : null,
  );
  root.classList.remove('show');
  void root.offsetWidth;
  root.classList.add('show');
  msgTimer = setTimeout(() => root.classList.remove('show'), kind === 'error' ? 1100 : 1500);
}
