// One modal at a time. Escape / backdrop / close button dismiss it; focus returns.

import { h, icon } from './dom.js';

let current = null;

export function isModalOpen() {
  return !!current;
}

export function closeModal() {
  if (!current) return;
  const { root, onClose, returnFocus } = current;
  current = null;
  root.remove();
  document.removeEventListener('keydown', onKey, true);
  onClose?.();
  returnFocus?.focus?.();
}

function onKey(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeModal();
  } else if (e.key === 'Tab' && current) {
    const f = [...current.root.querySelectorAll('button, a[href], textarea, input, select, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

// content: Node or array of nodes. variant: '' | 'splash' | 'celebrate'
export function openModal({ title, content, onClose, variant = '', hideTitle = false }) {
  closeModal();
  const titleId = 'modal-title';
  const closeBtn = h('button', { class: 'icon-btn modal-close', type: 'button', 'aria-label': 'Close', onclick: closeModal }, icon('close'));
  const card = h('div', { class: `modal-card ${variant}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    closeBtn,
    h('h2', { id: titleId, class: `modal-title${hideTitle ? ' visually-hidden' : ''}` }, title),
    h('div', { class: 'modal-body' }, content),
  );
  const root = h('div', { class: `modal-backdrop ${variant}` }, card);
  root.addEventListener('click', (e) => { if (e.target === root) closeModal(); });
  document.getElementById('modal-root').append(root);
  current = { root, onClose, returnFocus: document.activeElement };
  document.addEventListener('keydown', onKey, true);
  (card.querySelector('[data-autofocus]') || closeBtn).focus();
  return closeModal;
}
