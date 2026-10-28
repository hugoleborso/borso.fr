import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '../../i18n/i18n.setup';
import { createIsolatedQueryClient } from '../../lib/queries/queries.test-utils';
import { BLANK_SONG_DRAFT } from '../../routes/catalog/song-draft.core';
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

function renderForm(refusal: SongSaveRefusal): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter>
        <SongEditForm
          isNew
          songId={undefined}
          defaultValues={BLANK_SONG_DRAFT}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
          newLinkUrl=""
          setNewLinkUrl={vi.fn()}
          refusal={refusal}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
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

  it('shows a refused save beside the Save button rather than above the fields', () => {
    renderForm({ failureMessage: null, takenTrack: { songId: HOLDER_ID, songTitle: 'Get Lucky' } });

    const actions = screen.getByRole('alert').parentElement;
    if (actions === null) throw new Error('the alert has no container');
    expect(within(actions).getByRole('button', { name: 'Save' })).toBeDefined();
    expect(within(actions).queryByRole('textbox')).toBeNull();
  });

  it('turns pasted chords above lyrics into a preview under the text box, with no ChordPro typed', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue('Am     G\nHello there');
    renderForm(NO_SAVE_REFUSAL);

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
    renderForm(NO_SAVE_REFUSAL);

    expect(screen.getByRole('button', { name: 'Photo' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'PDF' })).toBeDefined();
    expect(screen.queryByLabelText('Deezer track ID')).toBeNull();
  });

  it('shows no alert before a save is refused', () => {
    renderForm(NO_SAVE_REFUSAL);

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
