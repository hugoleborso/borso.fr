import { describe, expect, it } from 'vitest';
import {
  CUTOVER_CACHE_MILLISECONDS,
  isCutoverKey,
  isStorageModeReadingFresh,
} from './memory-cutover.core';

const READ_AT = 1_000_000;

describe('isStorageModeReadingFresh', () => {
  it('has nothing to reuse before the first reading', () => {
    expect(isStorageModeReadingFresh(null, READ_AT)).toBe(false);
  });

  it('reuses a reading younger than the cache window', () => {
    const reading = { mode: 'database' as const, readAtMilliseconds: READ_AT };
    expect(isStorageModeReadingFresh(reading, READ_AT + CUTOVER_CACHE_MILLISECONDS - 1)).toBe(true);
  });

  it('reads again once the window has passed', () => {
    const reading = { mode: 'git' as const, readAtMilliseconds: READ_AT };
    expect(isStorageModeReadingFresh(reading, READ_AT + CUTOVER_CACHE_MILLISECONDS)).toBe(false);
  });
});

describe('isCutoverKey', () => {
  it('recognises the cutover state key only', () => {
    expect(isCutoverKey('cutover')).toBe(true);
    expect(isCutoverKey('cursors')).toBe(false);
  });
});
