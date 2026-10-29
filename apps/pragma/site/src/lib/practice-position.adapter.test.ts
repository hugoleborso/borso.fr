import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgetPracticePosition,
  readStoredPracticePosition,
  writePracticePosition,
} from './practice-position.adapter';

const ONE_PRACTICE = 'aaaaaaaa-1111-4111-8111-111111111111';
const ANOTHER_PRACTICE = 'bbbbbbbb-2222-4222-8222-222222222222';
const POSITION = '{"day":"2026-10-28","entryId":"entry-b","index":1}';

function refuse(): never {
  throw new Error('blocked');
}

describe('the practice position this device holds', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is absent for a practice never started on this device', () => {
    expect(readStoredPracticePosition(ONE_PRACTICE)).toBeNull();
  });

  it('is kept per practice', () => {
    writePracticePosition(ONE_PRACTICE, POSITION);
    expect(readStoredPracticePosition(ONE_PRACTICE)).toBe(POSITION);
    expect(readStoredPracticePosition(ANOTHER_PRACTICE)).toBeNull();
  });

  it('is gone once the practice is ended', () => {
    writePracticePosition(ONE_PRACTICE, POSITION);
    forgetPracticePosition(ONE_PRACTICE);
    expect(readStoredPracticePosition(ONE_PRACTICE)).toBeNull();
  });

  it('reads nothing and writes nothing when the storage refuses', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(refuse);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(refuse);
    expect(readStoredPracticePosition(ONE_PRACTICE)).toBeNull();
    expect(() => writePracticePosition(ONE_PRACTICE, POSITION)).not.toThrow();
    expect(() => forgetPracticePosition(ONE_PRACTICE)).not.toThrow();
  });
});
