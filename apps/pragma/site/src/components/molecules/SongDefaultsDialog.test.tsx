import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { stubSheetDialog } from './sheet.test-utils';
import { type SongDefaults, SongDefaultsDialog } from './SongDefaultsDialog';

const DEFAULTS: SongDefaults = {
  status: 'wip',
  tonalityStart: 'Am',
  tonalityEnd: null,
  baseEnergy: null,
};

function renderDialog(songId: string) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <SongDefaultsDialog
      open
      songId={songId}
      songTitle="Superstition"
      defaults={DEFAULTS}
      onSave={onSave}
      onClose={onClose}
    />,
  );
  return { ...view, onSave, onClose };
}

function readStartKey(): string {
  const field = screen.getByLabelText('Key — start');
  return field instanceof HTMLInputElement ? field.value : '';
}

// @FollowsBlueprint test-component-render
describe('a song defaults draft', () => {
  beforeEach(() => {
    stubSheetDialog();
  });

  afterEach(() => {
    cleanup();
  });

  it('is kept after a click on the backdrop and shown on reopening', () => {
    const first = renderDialog('song-kept');
    fireEvent.change(screen.getByLabelText('Key — start'), { target: { value: 'C#m' } });
    fireEvent.click(screen.getByRole('dialog'));
    expect(first.onClose).toHaveBeenCalled();
    first.unmount();
    renderDialog('song-kept');
    expect(readStartKey()).toBe('C#m');
  });

  it('is gone once saved', () => {
    const first = renderDialog('song-saved');
    fireEvent.change(screen.getByLabelText('Key — start'), { target: { value: 'Dm' } });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    first.unmount();
    renderDialog('song-saved');
    expect(readStartKey()).toBe('Am');
  });
});
