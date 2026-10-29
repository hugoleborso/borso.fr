import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '../../i18n/i18n.setup';
import { createIsolatedQueryClient } from '../../lib/queries/queries.test-utils';
import { BLANK_SONG_DRAFT, type SongDraftState } from '../../routes/catalog/song-draft.core';
import type { SongEditSection } from '../../routes/catalog/song-edit-page.core';
import { NO_SAVE_REFUSAL, type SongSaveRefusal } from '../../lib/queries/song-save-refusal.core';
import { recordProductEvent } from '../../observability/product-event.adapter';
import { SongEditForm } from './SongEditForm';

vi.mock('../../observability/product-event.adapter', () => ({
  recordProductEvent: vi.fn(),
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const HOLDER_ID = '0b6f1f5e-3c56-4b8e-9d63-0f5b4b1f2a10';

const MEMBERS = [
  { id: 'member-lea', name: 'Léa', color: '#aa3355' },
  { id: 'member-hugo', name: 'Hugo', color: '#3355aa' },
];
const INSTRUMENTS = [
  { id: 'bass', name: 'Bass' },
  { id: 'voice', name: 'Voice' },
];

interface RenderOptions {
  readonly section?: SongEditSection;
  readonly onSubmit?: (value: SongDraftState) => Promise<void>;
}

function songEditForm(
  client: QueryClient,
  refusal: SongSaveRefusal,
  section: SongEditSection,
  onSubmit: (value: SongDraftState) => Promise<void>,
): JSX.Element {
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SongEditForm
          isNew
          songId={undefined}
          defaultValues={{ ...BLANK_SONG_DRAFT, title: 'Slow Burn' }}
          section={section}
          members={MEMBERS}
          instruments={INSTRUMENTS}
          onSectionChange={vi.fn()}
          onSubmit={onSubmit}
          onDelete={vi.fn()}
          newLinkUrl=""
          setNewLinkUrl={vi.fn()}
          refusal={refusal}
        />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderForm(
  refusal: SongSaveRefusal,
  options: RenderOptions = {},
): (section: SongEditSection) => void {
  const client = createIsolatedQueryClient();
  const onSubmit = options.onSubmit ?? vi.fn();
  const view = render(songEditForm(client, refusal, options.section ?? 'identity', onSubmit));
  return (section) => view.rerender(songEditForm(client, refusal, section, onSubmit));
}

// @FollowsBlueprint test-component-render
describe('SongEditForm', () => {
  afterEach(() => {
    cleanup();
  });

  it('names the song already holding the Deezer track, with a link to it', () => {
    renderForm({ failureMessage: null, takenTrack: { songId: HOLDER_ID, songTitle: 'Get Lucky' } });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain(
      'This Deezer track already belongs to another song in the catalog:',
    );
    expect(within(alert).getByRole('link', { name: 'Get Lucky' }).getAttribute('href')).toBe(
      `/catalog/${HOLDER_ID}`,
    );
  });

  it('shows any other failed save as its message, with no link', () => {
    renderForm({ failureMessage: 'create 400', takenTrack: null });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('create 400');
    expect(within(alert).queryByRole('link')).toBeNull();
  });

  it('shows a refused save in the pinned header, beside the Save button', () => {
    renderForm({ failureMessage: null, takenTrack: { songId: HOLDER_ID, songTitle: 'Get Lucky' } });

    const header = screen.getByRole('banner');
    expect(within(header).getByRole('alert')).toBeDefined();
    expect(within(header).getByRole('button', { name: 'Save' })).toBeDefined();
    expect(within(header).queryByRole('textbox')).toBeNull();
  });

  it('keeps one Save in the header and one tab per group of fields', () => {
    renderForm(NO_SAVE_REFUSAL);

    expect(screen.getAllByRole('button', { name: 'Save' })).toHaveLength(1);
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Identity',
      'Music',
      'Notes',
      'Lineup',
    ]);
  });

  it('keeps an unsaved value across tabs and saves the lineup with the rest of the song', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(value: SongDraftState) => Promise<void>>().mockResolvedValue();
    const showSection = renderForm(NO_SAVE_REFUSAL, { onSubmit });

    await user.clear(screen.getByLabelText('Artist'));
    await user.type(screen.getByLabelText('Artist'), 'The Embers');
    showSection('lineup');
    await user.click(
      within(screen.getByRole('group', { name: 'Léa — Instruments' })).getByRole('button', {
        name: 'Bass',
      }),
    );
    showSection('identity');
    expect(screen.getByLabelText('Artist')).toHaveProperty('value', 'The Embers');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      title: 'Slow Burn',
      artist: 'The Embers',
      defaultLineup: { 'member-lea': ['bass'] },
    });
  });

  it('turns pasted chords above lyrics into a preview under the text box, with no ChordPro typed', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue('Am     G\nHello there');
    renderForm(NO_SAVE_REFUSAL, { section: 'music' });

    await user.click(screen.getByRole('button', { name: 'Paste text' }));

    const textBox = await screen.findByLabelText(
      'Chords above the lyrics, as chord sites show them',
    );
    expect(textBox).toHaveProperty('value', 'Am     G\nHello there');
    expect(recordProductEvent).toHaveBeenCalledExactlyOnceWith('chord_chart_added', {
      source: 'paste',
      converted: true,
    });
    const preview = await waitFor(() => screen.getByText('Chord chart', { selector: 'span' }));
    expect(
      textBox.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('offers paste, photo and PDF, and no Deezer track field', () => {
    renderForm(NO_SAVE_REFUSAL, { section: 'music' });

    expect(screen.getByRole('button', { name: 'Photo' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'PDF' })).toBeDefined();
    expect(screen.queryByLabelText('Deezer track ID')).toBeNull();
  });

  it('shows no alert before a save is refused', () => {
    renderForm(NO_SAVE_REFUSAL);

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
