import { describe, expect, it } from 'vitest';
import { isHttpsAddress } from './band-link.core';

// @FollowsBlueprint test-pure-unit
describe('isHttpsAddress', () => {
  it('accepts a shared folder address served over https', () => {
    expect(isHttpsAddress('https://drive.example.com/drive/folders/photos')).toBe(true);
  });

  it('refuses an http address, a script address and text that is not an address', () => {
    expect(isHttpsAddress('http://drive.example.com/drive/folders/photos')).toBe(false);
    expect(isHttpsAddress('javascript:alert(1)')).toBe(false);
    expect(isHttpsAddress('drive.example.com/folders/photos')).toBe(false);
    expect(isHttpsAddress('')).toBe(false);
  });
});
