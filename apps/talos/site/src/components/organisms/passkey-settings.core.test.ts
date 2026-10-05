import { describe, expect, it } from 'vitest';
import { canRemovePasskey, isLastPasskey, toLocalIsoDay } from './passkey-settings.core';

describe('canRemovePasskey', () => {
  it('lets the owner remove a passkey only while another one remains', () => {
    expect(canRemovePasskey(2)).toBe(true);
    expect(canRemovePasskey(1)).toBe(false);
    expect(canRemovePasskey(0)).toBe(false);
  });
});

describe('toLocalIsoDay', () => {
  it('reads the calendar day of an instant in the local time zone', () => {
    const instant = new Date(2026, 9, 5, 23, 30).toISOString();
    expect(toLocalIsoDay(instant)).toBe('2026-10-05');
  });
});

describe('isLastPasskey', () => {
  it('explains why the remove button is gone once only one passkey is left', () => {
    expect(isLastPasskey(1)).toBe(true);
    expect(isLastPasskey(2)).toBe(false);
    expect(isLastPasskey(undefined)).toBe(false);
  });
});
