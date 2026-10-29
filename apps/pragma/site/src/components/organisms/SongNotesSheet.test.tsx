import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { stubSheetDialog } from '../molecules/sheet.test-utils';
import { SongNotesSheet } from './SongNotesSheet';

const NO_NOTES = { structureNotes: '', gimmickNotes: '', notes: ' ' };

// @FollowsBlueprint test-component-render
describe('SongNotesSheet', () => {
  beforeEach(() => {
    stubSheetDialog();
  });

  afterEach(() => {
    cleanup();
  });

  it('offers to write the notes when the song has none', () => {
    render(
      <MemoryRouter>
        <SongNotesSheet songId="song-1" notes={NO_NOTES} onClose={() => undefined} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Nothing written down for this song yet.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe(
      '/catalog/song-1/edit?section=notes',
    );
  });
});
