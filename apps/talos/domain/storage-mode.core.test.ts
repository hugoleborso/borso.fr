import { describe, expect, it } from 'vitest';
import { isDatabaseStorage } from './storage-mode.core';

describe('isDatabaseStorage', () => {
  it('is true only once the cutover says database', () => {
    expect(isDatabaseStorage('database')).toBe(true);
    expect(isDatabaseStorage('git')).toBe(false);
    expect(isDatabaseStorage(undefined)).toBe(false);
  });
});
