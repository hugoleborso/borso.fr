import { describe, expect, it } from 'vitest';
import { isIosDevice } from './device.utils';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const IPOD = 'Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X)';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36';

// @FollowsBlueprint test-pure-unit
describe('isIosDevice', () => {
  it('recognises an iPhone and an iPod', () => {
    expect(isIosDevice(IPHONE, 5)).toBe(true);
    expect(isIosDevice(IPOD, 0)).toBe(true);
  });

  it('recognises an iPad that announces itself as a Mac by its touch points', () => {
    expect(isIosDevice(MAC, 5)).toBe(true);
    expect(isIosDevice(MAC, 2)).toBe(true);
    expect(isIosDevice(MAC, 1)).toBe(false);
    expect(isIosDevice(MAC, 0)).toBe(false);
  });

  it('does not mistake a touch Android phone for iOS', () => {
    expect(isIosDevice(ANDROID, 5)).toBe(false);
  });
});
