import { describe, expect, it } from 'vitest';
import { selectCalendarFeedFormMode } from './calendar-feed-form.utils';

describe('selectCalendarFeedFormMode', () => {
  it('asks for an address when the member has none, whatever was clicked before', () => {
    expect(selectCalendarFeedFormMode('absent', false)).toBe('entering');
    expect(selectCalendarFeedFormMode('absent', true)).toBe('entering');
  });

  it('shows the connected state, or the field once Replace is clicked', () => {
    expect(selectCalendarFeedFormMode('connected', false)).toBe('connected');
    expect(selectCalendarFeedFormMode('connected', true)).toBe('replacing');
  });
});
