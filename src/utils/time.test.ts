import assert from 'node:assert';
import { test } from 'node:test';
import { normalizeTimeInputs } from './time.ts';

test('normalizeTimeInputs handles 90 minutes correctly', () => {
  const result = normalizeTimeInputs(0, 90, 0);
  assert.deepStrictEqual(result, { hours: 1, minutes: 30, seconds: 0 });
});

test('normalizeTimeInputs handles 90 seconds correctly', () => {
  const result = normalizeTimeInputs(0, 0, 90);
  assert.deepStrictEqual(result, { hours: 0, minutes: 1, seconds: 30 });
});

test('normalizeTimeInputs handles complex carry over', () => {
  const result = normalizeTimeInputs(1, 90, 90);
  // 90s = 1m 30s -> minutes becomes 91 -> 91m = 1h 31m -> hours becomes 2
  assert.deepStrictEqual(result, { hours: 2, minutes: 31, seconds: 30 });
});
