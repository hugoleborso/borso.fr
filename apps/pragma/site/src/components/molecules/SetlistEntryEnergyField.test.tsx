import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { SetlistEntryEnergyField } from './SetlistEntryEnergyField';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const SERVER_LEVEL = 9;
const REQUESTED_LEVEL = 8;
const SONG_LEVEL = 4;

function renderField(entryEnergy: number | null): {
  onPublish: ReturnType<typeof vi.fn>;
  rerenderWith: (nextEntryEnergy: number | null) => void;
} {
  const onPublish = vi.fn();
  const view = render(
    <SetlistEntryEnergyField
      entryEnergy={entryEnergy}
      songEnergy={SONG_LEVEL}
      onPublish={onPublish}
    />,
  );
  const rerenderWith = (nextEntryEnergy: number | null): void => {
    view.rerender(
      <SetlistEntryEnergyField
        entryEnergy={nextEntryEnergy}
        songEnergy={SONG_LEVEL}
        onPublish={onPublish}
      />,
    );
  };
  return { onPublish, rerenderWith };
}

afterEach(cleanup);

// @FollowsBlueprint test-pure-unit
describe('SetlistEntryEnergyField', () => {
  it('shows the level the entry stores', () => {
    renderField(SERVER_LEVEL);
    expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe(String(SERVER_LEVEL));
  });

  it('falls back to the song level when the entry stores none', () => {
    renderField(null);
    expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe(String(SONG_LEVEL));
  });

  it('publishes the level the gesture asks for', async () => {
    const { onPublish } = renderField(SERVER_LEVEL);
    const meter = screen.getByRole('slider');
    meter.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onPublish).toHaveBeenCalledWith(REQUESTED_LEVEL);
  });

  it('returns to the value the server kept when the write is refused and the cache rolls back', async () => {
    const { rerenderWith } = renderField(SERVER_LEVEL);
    const meter = screen.getByRole('slider');
    meter.focus();
    await userEvent.keyboard('{ArrowLeft}');
    rerenderWith(REQUESTED_LEVEL);
    expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe(String(REQUESTED_LEVEL));
    rerenderWith(SERVER_LEVEL);
    expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe(String(SERVER_LEVEL));
  });
});
