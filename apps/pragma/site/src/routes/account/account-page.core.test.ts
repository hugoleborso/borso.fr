import { describe, expect, it } from 'vitest';
import { ACCOUNT_SECTIONS, readAccountSection } from './account-page.core';

describe('readAccountSection', () => {
  it('reads every section the address can name', () => {
    expect(ACCOUNT_SECTIONS.map((section) => readAccountSection(section))).toEqual([
      'profile',
      'sign-in',
      'calendar',
      'notifications',
      'language',
    ]);
  });

  it('opens on the profile for an unknown or absent section', () => {
    expect(readAccountSection(null)).toBe('profile');
    expect(readAccountSection('passkeys')).toBe('profile');
  });
});
