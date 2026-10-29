import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { reportSetlistBatchAddFailed } from '../../observability/error-reporting.adapter';
import { recordProductEvent } from '../../observability/product-event.adapter';
import { stubSheetDialog } from '../molecules/sheet.test-utils';
import { SetlistSongPicker, type SetlistSongPickerProps } from './SetlistSongPicker';

interface MutateOptions {
  readonly onSuccess?: () => void;
  readonly onError?: () => void;
}

const batch = vi.hoisted(() => ({
  mutate: vi.fn<(variables: unknown, options: MutateOptions) => void>(),
}));

vi.mock('../../lib/queries/setlist-entries.queries', () => ({
  useAddSetlistEntries: () => ({ mutate: batch.mutate, isPending: false }),
}));

vi.mock('../../lib/queries/songs.queries', () => ({
  useCreateSong: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSongSearch: () => ({ data: undefined, error: null }),
}));

vi.mock('../../observability/error-reporting.adapter', () => ({
  reportSetlistBatchAddFailed: vi.fn(),
}));

vi.mock('../../observability/product-event.adapter', () => ({
  recordProductEvent: vi.fn(),
}));

function buildProps(overrides: Partial<SetlistSongPickerProps> = {}): SetlistSongPickerProps {
  return {
    open: true,
    setlistId: `setlist-${crypto.randomUUID()}`,
    setlistName: 'Set principal',
    songs: [
      {
        id: 'dreams',
        title: 'Dreams',
        artist: 'Fleetwood Mac',
        status: 'rehearsed',
        deezerAlbumId: null,
      },
      {
        id: 'jolene',
        title: 'Jolene',
        artist: 'Dolly Parton',
        status: 'idea',
        deezerAlbumId: null,
      },
      {
        id: 'hey-ya',
        title: 'Hey Ya!',
        artist: 'OutKast',
        status: 'rehearsed',
        deezerAlbumId: null,
      },
    ],
    setlistSongIds: ['hey-ya'],
    onClose: () => undefined,
    ...overrides,
  };
}

function checkbox(title: string): HTMLElement {
  return screen.getByRole('checkbox', { name: new RegExp(`^${title}`) });
}

// @FollowsBlueprint test-component-render
describe('the Add songs sheet', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    stubSheetDialog();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('opens with the focus in the search, on the songs not in the setlist yet', () => {
    render(<SetlistSongPicker {...buildProps()} />);
    expect(document.activeElement).toBe(screen.getByRole('searchbox'));
    expect(screen.queryByRole('checkbox', { name: /^Hey Ya!/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Add songs' }).hasAttribute('disabled')).toBe(true);
  });

  it('numbers the picks in order, unpicks on a second tap and writes nothing before Add', () => {
    render(<SetlistSongPicker {...buildProps()} />);
    fireEvent.click(checkbox('Jolene'));
    fireEvent.click(checkbox('Dreams'));
    expect(checkbox('Jolene').textContent).toContain('1');
    expect(checkbox('Dreams').getAttribute('aria-checked')).toBe('true');
    fireEvent.click(checkbox('Jolene'));
    expect(checkbox('Jolene').getAttribute('aria-checked')).toBe('false');
    expect(batch.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 song' }));
    expect(batch.mutate).toHaveBeenCalledWith(
      {
        setlistId: expect.stringMatching(/^setlist-/),
        appends: [{ songId: 'dreams', temporaryId: expect.any(String) }],
      },
      expect.anything(),
    );
  });

  it('empties the search after a pick, so the next title is typed straight away', () => {
    render(<SetlistSongPicker {...buildProps()} />);
    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'jol' } });
    fireEvent.click(checkbox('Jolene'));
    expect(screen.getByRole<HTMLInputElement>('searchbox').value).toBe('');
    expect(checkbox('Jolene').getAttribute('aria-checked')).toBe('true');
    expect(checkbox('Dreams')).toBeTruthy();
  });

  it('dims a song already in the setlist under another chip, and it cannot be picked', () => {
    render(<SetlistSongPicker {...buildProps()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rehearsed' }));
    const alreadyIn = screen.getByRole('checkbox', { name: /Already in this setlist · 01/ });
    expect(alreadyIn.hasAttribute('disabled')).toBe(true);
  });

  it('keeps the sheet open with the picks and an error line when the add fails', () => {
    const onClose = vi.fn();
    const props = buildProps({ onClose });
    render(<SetlistSongPicker {...props} />);
    fireEvent.click(checkbox('Jolene'));
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 song' }));
    const [, options] = batch.mutate.mock.calls[0] ?? [];
    act(() => options?.onError?.());
    expect(onClose).not.toHaveBeenCalled();
    expect(reportSetlistBatchAddFailed).toHaveBeenCalledWith(props.setlistId);
    expect(screen.getByRole('alert').textContent).toContain('The songs were not added');
    expect(checkbox('Jolene').getAttribute('aria-checked')).toBe('true');
  });

  it('closes once the songs are added and counts how many one tap added', () => {
    const onClose = vi.fn();
    render(<SetlistSongPicker {...buildProps({ onClose })} />);
    fireEvent.click(checkbox('Jolene'));
    fireEvent.click(checkbox('Dreams'));
    fireEvent.click(screen.getByRole('button', { name: 'Add 2 songs' }));
    const [, options] = batch.mutate.mock.calls[0] ?? [];
    act(() => options?.onSuccess?.());
    expect(onClose).toHaveBeenCalledOnce();
    expect(recordProductEvent).toHaveBeenCalledExactlyOnceWith('setlist_songs_added', { count: 2 });
  });

  it('offers the typed title as a new idea when no song of the catalogue matches it', () => {
    render(<SetlistSongPicker {...buildProps()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Psycho Chicken' } });
    expect(screen.getByRole('button', { name: /New song as an idea/ })).toBeTruthy();
  });
});
