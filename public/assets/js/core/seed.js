// 같은 날, 같은 사람에게는 같은 결과가 나오도록 하는 결정적 난수.

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed) {
  let a = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(list, r) {
  return list[Math.floor(r() * list.length)];
}

export function shuffle(list, r) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 진짜 무작위(직접 뽑기용). crypto가 있으면 사용한다. */
export function trueRandom() {
  if (globalThis.crypto?.getRandomValues) {
    const b = new Uint32Array(1);
    globalThis.crypto.getRandomValues(b);
    return b[0] / 4294967296;
  }
  return Math.random();
}
