import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  describeSongToLearn,
  type LearnedInstrument,
} from '../../routes/catalog/catalog-page.core';
import { SongCard } from './SongCard';

const INSTRUMENTS_BY_ID = new Map<string, LearnedInstrument>([
  ['bass-id', { id: 'bass-id', name: 'Bass', icon: 'bass' }],
  ['keys-id', { id: 'keys-id', name: 'Keys', icon: 'piano' }],
]);

// @FollowsBlueprint test-component-render
describe('SongCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('draws each instrument to learn as its glyph, named by its word for a screen reader', () => {
    const toLearn = describeSongToLearn(
      { song: null, instrumentIds: ['bass-id', 'keys-id'], lowestScore: 4 },
      INSTRUMENTS_BY_ID,
    );
    render(
      <MemoryRouter>
        <SongCard
          id="song-id"
          title="Superstition"
          detail={toLearn.detail}
          instruments={toLearn.instruments}
          deezerAlbumId={null}
          status="wip"
          chartKind={null}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('img', { name: 'Bass' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Keys' })).toBeTruthy();
    expect(screen.getByText('· 4/10')).toBeTruthy();
  });
});
