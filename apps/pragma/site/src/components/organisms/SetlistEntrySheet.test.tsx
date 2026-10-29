import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { reportEntryNoteSaveFailed } from '../../observability/error-reporting.adapter';
import { recordProductEvent } from '../../observability/product-event.adapter';
import { stubSheetDialog } from '../molecules/sheet.test-utils';
import { SetlistEntrySheet, type SetlistEntrySheetProps } from './SetlistEntrySheet';

vi.mock('../../observability/error-reporting.adapter', () => ({
  reportEntryNoteSaveFailed: vi.fn(),
}));

vi.mock('../../observability/product-event.adapter', () => ({
  recordProductEvent: vi.fn(),
}));

const SAVE_PAUSE_MS = 600;

function buildProps(overrides: Partial<SetlistEntrySheetProps> = {}): SetlistEntrySheetProps {
  return {
    setlistId: 'setlist-1',
    entry: {
      id: 'entry-1',
      songId: 'song-1',
      keyOverride: null,
      capo: null,
      energy: null,
      notes: '',
      lineupOverride: null,
    },
    song: {
      title: 'Superstition',
      artist: 'Stevie Wonder',
      deezerAlbumId: null,
      durationSeconds: 245,
      baseEnergy: 3,
      defaultLineup: { tom: ['bass'] },
    },
    position: 2,
    songCount: 20,
    members: [
      { id: 'tom', firstName: 'Tom', color: '#3d8b8b' },
      { id: 'lea', firstName: 'Léa', color: '#e07a5f' },
    ],
    instruments: [
      { id: 'bass', name: 'Bass', icon: 'bass', position: 1 },
      { id: 'guitar', name: 'Guitar', icon: 'guitar', position: 2 },
    ],
    focus: 'note',
    onSave: async () => ({}),
    onUpdate: () => undefined,
    onSaveSongLineup: () => undefined,
    onRecordTake: () => undefined,
    onClose: () => undefined,
    ...overrides,
  };
}

function renderSheet(props: SetlistEntrySheetProps): void {
  render(
    <MemoryRouter>
      <SetlistEntrySheet {...props} />
    </MemoryRouter>,
  );
}

// @FollowsBlueprint test-component-render
describe('the entry sheet', () => {
  beforeEach(() => {
    stubSheetDialog();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('names the song, its length and its place in the setlist, and opens the song', () => {
    renderSheet(buildProps());
    expect(screen.getByText('Stevie Wonder · 4:05')).toBeTruthy();
    expect(screen.getByText('Song 2 of 20 · tonight only')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open the song' }).getAttribute('href')).toBe(
      '/catalog/song-1',
    );
  });

  it('puts the focus in the note field, never on Close', () => {
    renderSheet(buildProps());
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Notes' }));
  });

  it('puts the focus on the lineup when it was opened from the Lineup grid', () => {
    renderSheet(buildProps({ focus: 'lineup' }));
    expect(document.activeElement?.textContent).toBe('Bass');
  });

  it('saves the note after a pause and says so', async () => {
    vi.useFakeTimers();
    const onSave = vi.fn(async () => ({}));
    renderSheet(buildProps({ onSave }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Notes' }), {
      target: { value: 'Finir sur le refrain' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAVE_PAUSE_MS);
    });
    expect(onSave).toHaveBeenCalledExactlyOnceWith('entry-1', { notes: 'Finir sur le refrain' });
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(recordProductEvent).toHaveBeenCalledExactlyOnceWith('entry_note_saved');
  });

  it('keeps the text, says Not saved and retries when a save fails', async () => {
    const onSave = vi
      .fn<SetlistEntrySheetProps['onSave']>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({});
    renderSheet(buildProps({ onSave }));
    const notes = screen.getByRole('textbox', { name: 'Notes' });
    fireEvent.change(notes, { target: { value: 'Tempo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.getByText('Not saved')).toBeTruthy();
    });
    expect(reportEntryNoteSaveFailed).toHaveBeenCalledWith('setlist-1');
    expect(screen.getByDisplayValue('Tempo')).toBe(notes);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(2);
    });
  });

  it('saves the full note when closed before the pause ends', () => {
    const onSave = vi.fn(async () => ({}));
    const onClose = vi.fn();
    renderSheet(buildProps({ onSave, onClose }));
    const notes = screen.getByRole('textbox', { name: 'Notes' });
    fireEvent.change(notes, { target: { value: 'F' } });
    fireEvent.change(notes, { target: { value: 'Finir sur le refrain' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onSave).toHaveBeenCalledExactlyOnceWith('entry-1', { notes: 'Finir sur le refrain' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('saves the key and capo, and clears them when emptied', () => {
    const onSave = vi.fn(async () => ({}));
    renderSheet(
      buildProps({ onSave, entry: { ...buildProps().entry, keyOverride: 'G', capo: 1 } }),
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Key' }), { target: { value: '' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Capo' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onSave).toHaveBeenCalledWith('entry-1', { keyOverride: null });
    expect(onSave).toHaveBeenCalledWith('entry-1', { capo: null });
  });

  it('changes tonight’s lineup inline and resets it to the song’s lineup', () => {
    const onUpdate = vi.fn();
    renderSheet(buildProps({ onUpdate }));
    const leaChips = screen.getByRole('group', { name: 'Léa — Instruments' });
    fireEvent.click(Array.from(leaChips.querySelectorAll('button'))[1] ?? leaChips);
    expect(onUpdate).toHaveBeenCalledWith('entry-1', {
      lineupOverride: { tom: ['bass'], lea: ['guitar'] },
    });
    expect(screen.queryByRole('button', { name: "Use the song's lineup" })).toBeNull();
  });

  it('marks a member changed tonight and offers the song’s lineup back', () => {
    const onUpdate = vi.fn();
    renderSheet(
      buildProps({
        onUpdate,
        entry: { ...buildProps().entry, lineupOverride: { tom: ['guitar'] } },
      }),
    );
    expect(screen.getByText('Changed tonight')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: "Use the song's lineup" }));
    expect(onUpdate).toHaveBeenCalledWith('entry-1', { lineupOverride: null });
  });

  it('gives a song with no lineup its first lineup as the song’s own', () => {
    const onSaveSongLineup = vi.fn();
    renderSheet(
      buildProps({ onSaveSongLineup, song: { ...buildProps().song, defaultLineup: {} } }),
    );
    const tomChips = screen.getByRole('group', { name: 'Tom — Instruments' });
    fireEvent.click(Array.from(tomChips.querySelectorAll('button'))[0] ?? tomChips);
    expect(onSaveSongLineup).toHaveBeenCalledWith({ tom: ['bass'], lea: [] });
  });

  it('clears the override when the last instrument is taken off', () => {
    const onUpdate = vi.fn();
    renderSheet(buildProps({ onUpdate }));
    const tomChips = screen.getByRole('group', { name: 'Tom — Instruments' });
    fireEvent.click(Array.from(tomChips.querySelectorAll('button'))[0] ?? tomChips);
    expect(onUpdate).toHaveBeenCalledWith('entry-1', { lineupOverride: null });
  });

  it('records a take after saving, without opening a second sheet itself', () => {
    const onSave = vi.fn(async () => ({}));
    const onRecordTake = vi.fn();
    renderSheet(buildProps({ onSave, onRecordTake }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Notes' }), {
      target: { value: 'Tempo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record a take' }));
    expect(onSave).toHaveBeenCalledWith('entry-1', { notes: 'Tempo' });
    expect(onRecordTake).toHaveBeenCalledOnce();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('offers tonight’s energy level until the Order screen takes it', () => {
    renderSheet(buildProps());
    expect(screen.getByRole('slider', { name: 'Energy' })).toBeTruthy();
  });
});
