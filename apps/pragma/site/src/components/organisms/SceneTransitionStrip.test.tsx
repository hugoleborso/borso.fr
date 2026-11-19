import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { SceneTransitionStrip } from './SceneTransitionStrip';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// @FollowsBlueprint test-jsdom-gap-stub
function stubDialogModalMissingFromJsdom(): void {
  function stubShowModal(this: HTMLDialogElement): void {
    this.setAttribute('open', '');
  }
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: stubShowModal,
  });
}

describe('SceneTransitionStrip', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    stubDialogModalMissingFromJsdom();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <SceneTransitionStrip
          nextTitle="Midnight Drive"
          nextTonality={null}
          transition={{ isRisky: false, members: [] }}
          note=""
        />,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('closes the popup natively from its close button, so the browser hands focus back to the strip', () => {
    act(() => {
      container.querySelector('button')?.click();
    });
    const closeButton = container.querySelector<HTMLButtonElement>('dialog [data-sheet-close]');
    expect(closeButton?.type).toBe('submit');
    expect(closeButton?.form?.method).toBe('dialog');
  });

  it('removes the popup once the dialog has closed', () => {
    act(() => {
      container.querySelector('button')?.click();
    });
    act(() => {
      container.querySelector('dialog')?.dispatchEvent(new Event('close'));
    });
    expect(container.querySelector('dialog')).toBeNull();
  });
});
