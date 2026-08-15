import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@/i18n/i18n';
import { EMPTY_PLAY_SCOPE, FULL_SELECTION } from '@/openings/playScope.core';
import { LearnTreeSession } from './LearnTreeSession';

// @FollowsBlueprint test-component-render
describe('LearnTreeSession', () => {
  it('asks the user to pick a variation when the selection names none', () => {
    render(
      <LearnTreeSession
        openings={[]}
        selection={FULL_SELECTION}
        playScope={EMPTY_PLAY_SCOPE}
        side="white"
        boardStyle="chesscom"
        isAutoOpponentEnabled
        areMovesShown={false}
        visualization="arrows"
      />,
    );
    expect(screen.getByRole('status').textContent).toBe(
      'Pick an opening + variation to drill its tree.',
    );
  });
});
