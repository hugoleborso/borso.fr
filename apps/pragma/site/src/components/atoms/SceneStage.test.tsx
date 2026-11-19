import { act } from 'react';
import { Modal, ModalOverlay } from 'react-aria-components';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SceneStage } from './SceneStage';

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

describe('SceneStage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    stubDialogModalMissingFromJsdom();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('opens a modal stage named by its label', () => {
    act(() => {
      root.render(
        <SceneStage label="Helpless" onClose={vi.fn()}>
          <p>chart</p>
        </SceneStage>,
      );
    });
    const stage = container.querySelector('dialog');
    expect(stage?.getAttribute('aria-label')).toBe('Helpless');
    expect(stage?.hasAttribute('open')).toBe(true);
  });

  it('mounts a modal opened on stage inside the stage, where the top layer shows it', () => {
    act(() => {
      root.render(
        <SceneStage label="Helpless" onClose={vi.fn()}>
          <ModalOverlay isOpen>
            <Modal data-sheet>lineup</Modal>
          </ModalOverlay>
        </SceneStage>,
      );
    });
    const sheet = document.querySelector('[data-sheet]');
    expect(sheet).not.toBeNull();
    expect(container.querySelector('dialog')?.contains(sheet)).toBe(true);
  });
});
