import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { stubSheetDialog } from '../molecules/sheet.test-utils';
import { SetlistBreakRow } from './SetlistBreakRow';

function renderBreak(label: string, onRename = vi.fn(), onRemove = vi.fn()): HTMLInputElement {
  render(
    <ul>
      <SetlistBreakRow label={label} onRename={onRename} onRemove={onRemove} />
    </ul>,
  );
  const input = screen.getByRole('textbox', { name: 'Break label' });
  if (!(input instanceof HTMLInputElement)) throw new Error('the break label is not an input');
  return input;
}

// @FollowsBlueprint test-component-render
describe('a setlist break', () => {
  beforeEach(() => {
    stubSheetDialog();
  });

  afterEach(() => {
    cleanup();
  });

  it('reads Break until the band names it', () => {
    const input = renderBreak('');
    expect(input.value).toBe('');
    expect(input.placeholder).toBe('Break');
  });

  it('saves the trimmed label when the field loses focus, and only when it changed', () => {
    const onRename = vi.fn();
    const input = renderBreak('Intermission', onRename);
    fireEvent.blur(input);
    expect(onRename).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '  Tune the bass ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);
    expect(onRename).toHaveBeenCalledExactlyOnceWith('Tune the bass');
  });

  it('removes the break from its more menu', () => {
    const onRemove = vi.fn();
    renderBreak('', vi.fn(), onRemove);
    fireEvent.click(screen.getByRole('button', { name: 'Remove the break', hidden: true }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
