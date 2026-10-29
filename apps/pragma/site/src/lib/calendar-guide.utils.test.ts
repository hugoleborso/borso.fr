import { describe, expect, it } from 'vitest';
import { selectCalendarPlatform } from './calendar-guide.utils';

const IPHONE_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const IPAD_AS_MAC_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const ANDROID_AGENT = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130';
const DESKTOP_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130';

describe('selectCalendarPlatform', () => {
  it('reads an iPhone, and an iPad that presents itself as a Mac', () => {
    expect(selectCalendarPlatform(IPHONE_AGENT, 5)).toBe('iphone');
    expect(selectCalendarPlatform(IPAD_AS_MAC_AGENT, 5)).toBe('iphone');
  });

  it('reads an Android phone', () => {
    expect(selectCalendarPlatform(ANDROID_AGENT, 5)).toBe('android');
  });

  it('falls back to a computer, a Mac without touch included', () => {
    expect(selectCalendarPlatform(DESKTOP_AGENT, 0)).toBe('computer');
    expect(selectCalendarPlatform(IPAD_AS_MAC_AGENT, 0)).toBe('computer');
  });
});
