import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { BAND_CALENDAR_ID, bandCalendarSubscribeAddress } from '../../lib/band-calendar.utils';
import { stubSheetDialog } from '../molecules/sheet.test-utils';
import { BandCalendarSubscription } from './BandCalendarSubscription';

const SUBSCRIBE_ADDRESS = bandCalendarSubscribeAddress(BAND_CALENDAR_ID);

// @FollowsBlueprint test-component-render
describe('BandCalendarSubscription', () => {
  beforeEach(() => {
    stubSheetDialog();
  });

  afterEach(() => {
    cleanup();
  });

  it.each(['android', 'computer'] as const)(
    'subscribes %s in one tap through Google Calendar',
    (platform) => {
      render(<BandCalendarSubscription platform={platform} />);
      const link = screen.getByRole('link', { name: 'Subscribe to the band calendar' });
      expect(link.getAttribute('href')).toBe(SUBSCRIBE_ADDRESS);
      expect(link.getAttribute('data-variant')).toBe('secondary');
      expect(link.querySelector('svg')).not.toBeNull();
    },
  );

  it('walks an iPhone through the Settings steps, the Google link kept as a fallback', () => {
    render(<BandCalendarSubscription platform="iphone" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    const button = screen.getByRole('button', { name: 'Subscribe to the band calendar' });
    expect(button.getAttribute('data-variant')).toBe('secondary');
    fireEvent.click(button);
    const sheet = screen.getByRole('dialog', { name: 'Subscribe to the band calendar' });
    const steps = within(sheet).getAllByRole('listitem');
    expect(steps.map((step) => step.textContent)).toEqual([
      'Open Settings, then Calendar, then Accounts, and add the Google account that has access to the band calendar.',
      'Open the Calendar app, tap Calendars at the bottom, and tick "Activités groupe Pragma".',
    ]);
    const fallback = within(sheet).getByRole('link', { name: 'Open in Google Calendar' });
    expect(fallback.getAttribute('href')).toBe(SUBSCRIBE_ADDRESS);
  });

  it('closes the iPhone steps', () => {
    render(<BandCalendarSubscription platform="iphone" />);
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe to the band calendar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('reads the platform from the browser when none is given', () => {
    render(<BandCalendarSubscription />);
    expect(screen.getByRole('link', { name: 'Subscribe to the band calendar' })).toBeTruthy();
  });
});
