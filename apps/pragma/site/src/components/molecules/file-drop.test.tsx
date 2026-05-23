/**
 * UI-interaction test for the FileDrop molecule's Remove button.
 *
 * The other pure logic in this folder (validateChartFile, MIME projection)
 * is covered by `file-drop.utils.test.ts`. This file covers the one piece
 * that has no pure-helper form: clicking Remove must invoke `onRemoved`
 * AND, once the parent re-renders with an empty `currentObjectKey`, the
 * uploaded chip must vanish.
 *
 * No @testing-library/react dep — the test uses React's own `act` and
 * `createRoot` so no new tooling is added for a single component test.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileDrop } from './FileDrop';
import '../../i18n/i18n';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const REMOVE_BUTTON_TEXT_EN = 'Remove';

function findRemoveButton(container: HTMLElement): HTMLButtonElement | null {
  const buttons = Array.from(container.querySelectorAll('button'));
  return buttons.find((button) => button.textContent?.trim() === REMOVE_BUTTON_TEXT_EN) ?? null;
}

describe('FileDrop — Remove button', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders Remove in the uploaded state and falls back to the empty drop-zone when clicked', async () => {
    const onUploaded = vi.fn();
    const onRemoved = vi.fn();

    act(() => {
      root.render(
        <FileDrop
          currentObjectKey="charts/abc.pdf"
          onUploaded={onUploaded}
          onRemoved={onRemoved}
        />,
      );
    });

    const removeButton = findRemoveButton(container);
    expect(removeButton).not.toBeNull();
    expect(container.textContent).toContain('charts/abc.pdf');

    await act(async () => {
      removeButton?.click();
    });

    expect(onRemoved).toHaveBeenCalledTimes(1);
    expect(onUploaded).not.toHaveBeenCalled();

    act(() => {
      root.render(<FileDrop currentObjectKey="" onUploaded={onUploaded} onRemoved={onRemoved} />);
    });

    expect(findRemoveButton(container)).toBeNull();
    expect(container.textContent).not.toContain('charts/abc.pdf');
  });

  it('omits the Remove button when no onRemoved handler is provided', () => {
    act(() => {
      root.render(<FileDrop currentObjectKey="charts/abc.pdf" onUploaded={vi.fn()} />);
    });
    expect(findRemoveButton(container)).toBeNull();
  });
});
