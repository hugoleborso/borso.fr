import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { GOOGLE_CALENDAR_SETTINGS_ADDRESS } from '../../lib/calendar-guide.utils';
import { CalendarFeedForm } from './CalendarFeedForm';

const readTextFromClipboard = vi.hoisted(() => vi.fn<() => Promise<string | null>>());

vi.mock('../../lib/clipboard.adapter', () => ({ readTextFromClipboard }));

const SECRET_ADDRESS = 'https://calendar.google.com/calendar/ical/ada/private-abc/basic.ics';

interface RenderOptions {
  readonly feeds?: readonly { readonly id: string; readonly name: string | null }[];
  readonly onSave?: (address: string) => Promise<void>;
  readonly onRemove?: (feedId: string) => void;
}

function renderForm(options: RenderOptions = {}): void {
  render(
    <CalendarFeedForm
      feeds={options.feeds ?? []}
      message={null}
      error={null}
      isRemoving={false}
      onSave={options.onSave ?? (async () => undefined)}
      onRemove={options.onRemove ?? (() => undefined)}
    />,
  );
}

// @FollowsBlueprint test-jsdom-gap-stub
function stubDialogModalMissingFromJsdom(): void {
  function stubShowModal(this: HTMLDialogElement): void {
    this.setAttribute('open', '');
  }
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: stubShowModal,
  });
}

const TWO_FEEDS = [
  { id: 'feed-work', name: 'Work' },
  { id: 'feed-unnamed', name: null },
];

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
    renderForm({ onSave });

    fireEvent.click(screen.getByRole('button', { name: 'Paste and connect' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(SECRET_ADDRESS));
  });

  it('says to paste by hand when the clipboard cannot be read', async () => {
    readTextFromClipboard.mockResolvedValue(null);
    const onSave = vi.fn(async () => undefined);
    renderForm({ onSave });

    fireEvent.click(screen.getByRole('button', { name: 'Paste and connect' }));

    expect(await screen.findByText(/clipboard could not be read/)).not.toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('lists each calendar by its name, and by its position when its feed has none', () => {
    renderForm({ feeds: TWO_FEEDS });
    const list = screen.getByRole('list', { name: 'Connected calendars' });
    expect(list.textContent).toContain('Work');
    expect(list.textContent).toContain('Calendar 2');
    expect(screen.queryByLabelText('Secret iCal address')).toBeNull();
  });

  it('opens the address field to add one more calendar', async () => {
    const onSave = vi.fn(async () => undefined);
    renderForm({ feeds: TWO_FEEDS, onSave });

    fireEvent.click(screen.getByRole('button', { name: 'Add a calendar' }));
    fireEvent.change(screen.getByLabelText('Secret iCal address'), {
      target: { value: SECRET_ADDRESS },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(SECRET_ADDRESS));
  });

  it('removes only the calendar the member confirmed, named in the question', () => {
    stubDialogModalMissingFromJsdom();
    const onRemove = vi.fn();
    renderForm({ feeds: TWO_FEEDS, onRemove });

    const [removeWork] = screen.getAllByRole('button', { name: 'Remove' });
    if (removeWork === undefined) throw new Error('no Remove button');
    fireEvent.click(removeWork);
    expect(screen.getByText(/Remove the calendar Work\?/)).not.toBeNull();
    const confirmButtons = screen.getAllByRole('button', { name: 'Remove' });
    const confirm = confirmButtons.at(-1);
    if (confirm === undefined) throw new Error('no confirm button');
    fireEvent.click(confirm);

    expect(onRemove).toHaveBeenCalledWith('feed-work');
  });
});
