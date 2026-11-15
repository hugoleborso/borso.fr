import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { SongPreviewButton } from './SongPreviewButton';

const PREVIEW_URL = 'https://cdnt-preview.dzcdn.net/api/1/1/c/8/a/0/c8a6.mp3?hdnea=exp=1';
const PLAY = 'Play a 30-second excerpt';
const PAUSE = 'Pause the excerpt';

function readPlayer(): HTMLAudioElement {
  const player = document.querySelector('audio');
  if (player === null) throw new Error('no audio element');
  return player;
}

// @FollowsBlueprint test-component-render
describe('SongPreviewButton', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads nothing until pressed, then plays the excerpt and offers to pause it', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    render(<SongPreviewButton previewUrl={PREVIEW_URL} />);
    const player = readPlayer();
    expect(player.getAttribute('src')).toBe(PREVIEW_URL);
    expect(player.getAttribute('preload')).toBe('none');

    fireEvent.click(screen.getByRole('button', { name: PLAY }));
    expect(play).toHaveBeenCalledTimes(1);
    fireEvent.play(player);
    expect(screen.getByRole('button', { name: PAUSE })).toBeTruthy();
  });

  it('pauses a playing excerpt and offers to play it again', () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockReturnValue(undefined);
    render(<SongPreviewButton previewUrl={PREVIEW_URL} />);
    fireEvent.play(readPlayer());

    fireEvent.click(screen.getByRole('button', { name: PAUSE }));
    expect(pause).toHaveBeenCalledTimes(1);
    fireEvent.pause(readPlayer());
    expect(screen.getByRole('button', { name: PLAY })).toBeTruthy();
  });

  it('offers to play again once the excerpt ends or fails to load', () => {
    render(<SongPreviewButton previewUrl={PREVIEW_URL} />);
    fireEvent.play(readPlayer());
    fireEvent.ended(readPlayer());
    expect(screen.getByRole('button', { name: PLAY })).toBeTruthy();

    fireEvent.play(readPlayer());
    fireEvent.error(readPlayer());
    expect(screen.getByRole('button', { name: PLAY })).toBeTruthy();
  });

  it('stays ready to play when the browser refuses to start the excerpt', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('NotAllowedError'));
    render(<SongPreviewButton previewUrl={PREVIEW_URL} />);
    fireEvent.click(screen.getByRole('button', { name: PLAY }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: PLAY })).toBeTruthy();
    });
  });
});
