import assert from 'node:assert';
import { todayKey, yesterdayKey, timeUntilNextMidnight, formatRemainingTime } from '../src/rng';

console.log('Testing Local Midnight Date & Timer helpers...');

// 1. Test local todayKey formatting
const now = new Date(2026, 10, 12, 15, 30, 0); // Nov 12, 2026 3:30 PM local
assert.strictEqual(todayKey(now), '2026-11-12');

// 2. Test boundary condition at 11:59:59 PM vs 12:00:00 AM local
const beforeMidnight = new Date(2026, 10, 12, 23, 59, 59);
const atMidnight = new Date(2026, 10, 13, 0, 0, 0);
assert.strictEqual(todayKey(beforeMidnight), '2026-11-12');
assert.strictEqual(todayKey(atMidnight), '2026-11-13', 'Should flip key at local midnight');

// 3. Test yesterdayKey
assert.strictEqual(yesterdayKey(atMidnight), '2026-11-12');

// 4. Test timeUntilNextMidnight
const testDate = new Date(2026, 10, 12, 22, 0, 0); // 2 hours before midnight
const msRemaining = timeUntilNextMidnight(testDate);
assert.strictEqual(msRemaining, 2 * 3600 * 1000, 'Should be exactly 2 hours remaining');

// 5. Test formatRemainingTime
assert.strictEqual(formatRemainingTime(2 * 3600 * 1000), '2h 0m 0s');
assert.strictEqual(formatRemainingTime(3665 * 1000), '1h 1m 5s');
assert.strictEqual(formatRemainingTime(45 * 1000), '0h 0m 45s');

console.log('All Midnight Reset tests PASSED!');
