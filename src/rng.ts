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

/** Local calendar date key: YYYY-MM-DD in the player's local timezone. */
export function todayKey(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Yesterday's date key in the player's local timezone. */
export function yesterdayKey(now = new Date()): string {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return todayKey(yesterday);
}

/** Milliseconds remaining until the next local midnight (12:00:00 AM). */
export function timeUntilNextMidnight(now = new Date()): number {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, nextMidnight.getTime() - now.getTime());
}

/** Formats milliseconds into human-readable Xh Ym Zs format. */
export function formatRemainingTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

/** Four random 16-bit numbers for dynamic battle simulation. */
export function randomBattleSeed(): number[] {
  return [0, 1, 2, 3].map(() => Math.floor(Math.random() * 65536));
}

/** Four 16-bit numbers, the seed format the Showdown sim expects. */
export function battleSeed(key: string, index: number): number[] {
  const r = mulberry32(hashString(`battle:${key}:${index}`));
  return [0, 1, 2, 3].map(() => Math.floor(r() * 65535));
}
