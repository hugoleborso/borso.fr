import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UndoSnackbar } from './UndoSnackbar';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// @FollowsBlueprint test-component-render
describe('UndoSnackbar', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('announces what was removed and undoes it on one tap', () => {
    const onUndo = vi.fn();
    act(() => {
      root.render(<UndoSnackbar message="“Creep” removed" undoLabel="Undo" onUndo={onUndo} />);
    });
    expect(container.querySelector('[role="status"]')?.textContent).toContain('“Creep” removed');
    const undo = container.querySelector('button');
    expect(undo?.querySelector('svg')).not.toBeNull();
    act(() => undo?.click());
    expect(onUndo).toHaveBeenCalledOnce();
  });
});
