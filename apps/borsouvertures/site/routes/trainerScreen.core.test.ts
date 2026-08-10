import { describe, expect, it } from 'vitest';
import { selectTrainerScreenKind } from './trainerScreen.core';

describe('selectTrainerScreenKind', () => {
  it('shows the failure panel when the dataset did not load', () => {
    expect(selectTrainerScreenKind('failed', 'select')).toBe('load-failure');
  });

  it('shows the failure panel even when the stored view is a session', () => {
    expect(selectTrainerScreenKind('failed', 'session')).toBe('load-failure');
  });

  it('shows the selection screen for the select view', () => {
    expect(selectTrainerScreenKind('loaded', 'select')).toBe('selection');
  });

  it('shows the session screen for the session view', () => {
    expect(selectTrainerScreenKind('loaded', 'session')).toBe('session');
  });
});
