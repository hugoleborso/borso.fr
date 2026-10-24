import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '../../i18n/i18n.setup';
import { createIsolatedQueryClient } from '../../lib/queries/queries.test-utils';
import { BLANK_SONG_DRAFT } from '../../routes/catalog/song-draft.core';
import { NO_SAVE_REFUSAL, type SongSaveRefusal } from '../../lib/queries/song-save-refusal.core';
import { SongEditForm } from './SongEditForm';

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

  it('shows no alert before a save is refused', () => {
    renderForm(NO_SAVE_REFUSAL);

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
