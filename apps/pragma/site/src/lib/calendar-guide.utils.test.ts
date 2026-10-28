import { describe, expect, it } from 'vitest';
import {
  calendarGuideOf,
  GOOGLE_CALENDAR_SETTINGS_ADDRESS,
  selectCalendarPlatform,
} from './calendar-guide.utils';

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

describe('calendarGuideOf', () => {
  it('walks an iPhone through the iCloud share link, with no web page to open', () => {
    expect(calendarGuideOf('iphone')).toEqual({
      steps: ['iphone-open-calendars', 'iphone-tap-info', 'iphone-share-link', 'paste-here'],
      settingsAddress: null,
    });
  });

  it('sends Android to the Google Calendar settings page, where the secret address lives', () => {
    expect(calendarGuideOf('android')).toEqual({
      steps: ['google-open-settings', 'google-integrate', 'google-copy-secret', 'paste-here'],
      settingsAddress: GOOGLE_CALENDAR_SETTINGS_ADDRESS,
    });
  });

  it('adds the Outlook way on a computer, and always ends on pasting here', () => {
    const computerGuide = calendarGuideOf('computer');
    expect(computerGuide.steps).toContain('outlook-publish');
    expect(computerGuide.steps.at(-1)).toBe('paste-here');
    expect(computerGuide.settingsAddress).toBe(GOOGLE_CALENDAR_SETTINGS_ADDRESS);
  });
});
