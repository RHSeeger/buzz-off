// Honeycomb of 7 hexagon buttons. Index 0 is the center.

import { h, svg } from './dom.js';
import { shuffleInPlace } from '../prng.js';

const HEX = '<svg class="cell-hex" viewBox="0 0 120 104" aria-hidden="true"><polygon points="0,52 30,0 90,0 120,52 90,104 30,104"/></svg>';

export function createHive(container, onLetter) {
  let outer = [];
  const cells = [];
  for (let i = 0; i < 7; i++) {
    const letter = h('span', { class: 'cell-letter' });
    const btn = h('button', { class: `cell cell-${i}${i === 0 ? ' center' : ''}`, type: 'button' }, svg(HEX), letter);
    btn.addEventListener('click', () => {
      const l = btn.dataset.letter;
      if (l) onLetter(l);
      btn.classList.remove('pressed');
      void btn.offsetWidth;
      btn.classList.add('pressed');
    });
    cells.push({ btn, letter });
    container.append(btn);
  }

  function paint() {
    const letters = [center, ...outer];
    cells.forEach((c, i) => {
      c.btn.dataset.letter = letters[i];
      c.letter.textContent = letters[i].toUpperCase();
      c.btn.setAttribute('aria-label', `${letters[i].toUpperCase()}${i === 0 ? ', center letter' : ''}`);
    });
  }

  let center = '';
  return {
    setLetters(c, o) {
      center = c;
      outer = [...o];
      shuffleInPlace(outer);
      paint();
    },
    shuffle() {
      container.classList.add('shuffling');
      setTimeout(() => {
        shuffleInPlace(outer);
        paint();
        container.classList.remove('shuffling');
      }, 150);
    },
    flash(letter) {
      const c = cells.find((x) => x.btn.dataset.letter === letter);
      if (!c) return;
      c.btn.classList.remove('pressed');
      void c.btn.offsetWidth;
      c.btn.classList.add('pressed');
    },
    celebrate() {
      container.classList.remove('celebrate');
      void container.offsetWidth;
      container.classList.add('celebrate');
    },
  };
}
