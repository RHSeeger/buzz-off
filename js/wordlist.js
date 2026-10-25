// Word list loading and 26-bit letter masks.

export function letterMask(word) {
  let m = 0;
  for (let i = 0; i < word.length; i++) m |= 1 << (word.charCodeAt(i) - 97);
  return m;
}

export function bitCount(m) {
  m = m - ((m >>> 1) & 0x55555555);
  m = (m & 0x33333333) + ((m >>> 2) & 0x33333333);
  return (((m + (m >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

export function parseWordlist(text) {
  const words = text.split(/\r?\n/).map((w) => w.trim()).filter(Boolean);
  const masks = new Uint32Array(words.length);
  for (let i = 0; i < words.length; i++) masks[i] = letterMask(words[i]);
  return { words, masks, set: new Set(words) };
}

export async function loadWordlist(url = 'data/words.txt') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load word list (${res.status})`);
  return parseWordlist(await res.text());
}
