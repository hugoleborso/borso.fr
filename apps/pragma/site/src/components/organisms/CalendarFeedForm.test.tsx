import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { GOOGLE_CALENDAR_SETTINGS_ADDRESS } from '../../lib/calendar-guide.utils';
import { CalendarFeedForm } from './CalendarFeedForm';

const readTextFromClipboard = vi.hoisted(() => vi.fn<() => Promise<string | null>>());

vi.mock('../../lib/clipboard.adapter', () => ({ readTextFromClipboard }));

const SECRET_ADDRESS = 'https://calendar.google.com/calendar/ical/ada/private-abc/basic.ics';

function renderForm(onSave: (address: string) => Promise<void> = async () => undefined): void {
  render(
    <CalendarFeedForm
      state="absent"
      message={null}
      error={null}
      isRemoving={false}
      onSave={onSave}
      onRemove={() => undefined}
    />,
  );
}

// @FollowsBlueprint test-component-render
describe('CalendarFeedForm', () => {
  afterEach(() => {
    cleanup();
    readTextFromClipboard.mockReset();
  });

  it('offers the Google Calendar settings and the address field, with no steps to read', () => {
    renderForm();
    expect(
      screen.getByRole('link', { name: 'Open Google Calendar settings' }).getAttribute('href'),
    ).toBe(GOOGLE_CALENDAR_SETTINGS_ADDRESS);
    expect(screen.getByLabelText('Secret iCal address')).not.toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('pastes the copied address and saves it in one tap', async () => {
    readTextFromClipboard.mockResolvedValue(`  ${SECRET_ADDRESS}\n`);
    const onSave = vi.fn(async () => undefined);
    renderForm(onSave);

    fireEvent.click(screen.getByRole('button', { name: 'Paste and connect' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(SECRET_ADDRESS));
  });

  it('says to paste by hand when the clipboard cannot be read', async () => {
    readTextFromClipboard.mockResolvedValue(null);
    const onSave = vi.fn(async () => undefined);
    renderForm(onSave);

    fireEvent.click(screen.getByRole('button', { name: 'Paste and connect' }));

    expect(await screen.findByText(/clipboard could not be read/)).not.toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });
});
