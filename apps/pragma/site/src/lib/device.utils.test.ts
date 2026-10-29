import { describe, expect, it } from 'vitest';
import { guessDeviceName, isIosDevice } from './device.utils';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const IPOD = 'Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X)';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
const CHROMEBOOK = 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const LINUX = 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0';
const UNKNOWN = 'curl/8.5.0';

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

describe('guessDeviceName', () => {
  it('names a phone or a tablet after its kind', () => {
    expect(guessDeviceName(IPHONE, 5)).toBe('iPhone');
    expect(guessDeviceName(IPAD, 5)).toBe('iPad');
    expect(guessDeviceName(IPOD, 5)).toBe('iPod');
    expect(guessDeviceName(ANDROID, 5)).toBe('Android');
  });

  it('names an iPad that announces itself as a Mac by its touch points', () => {
    expect(guessDeviceName(MAC, 5)).toBe('iPad');
    expect(guessDeviceName(MAC, 1)).toBe('Mac');
  });

  it('names a computer after its system', () => {
    expect(guessDeviceName(CHROMEBOOK, 0)).toBe('Chromebook');
    expect(guessDeviceName(WINDOWS, 0)).toBe('Windows');
    expect(guessDeviceName(LINUX, 0)).toBe('Linux');
  });

  it('has no guess for an agent it does not know', () => {
    expect(guessDeviceName(UNKNOWN, 0)).toBe(null);
  });
});
