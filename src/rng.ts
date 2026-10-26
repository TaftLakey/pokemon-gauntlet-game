export function hashString(s: string): number {
  let h = 2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Everyone shares the same day: UTC date, YYYY-MM-DD. */
export const todayKey = () => new Date().toISOString().slice(0, 10);

/** Four 16-bit numbers, the seed format the Showdown sim expects. */
export function battleSeed(key: string, index: number): number[] {
  const r = mulberry32(hashString(`battle:${key}:${index}`));
  return [0, 1, 2, 3].map(() => Math.floor(r() * 65535));
}
