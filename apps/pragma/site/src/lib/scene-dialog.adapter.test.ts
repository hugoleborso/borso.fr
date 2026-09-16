import { describe, expect, it, vi } from 'vitest';
import { openSceneOnAttach } from './scene-dialog.adapter';

interface OpenableDialog {
  readonly dialog: HTMLDialogElement;
  readonly showModal: ReturnType<typeof vi.fn>;
}

function attachedDialog(): OpenableDialog {
  const dialog = document.createElement('dialog');
  const showModal = vi.fn();
  dialog.showModal = showModal;
  document.body.append(dialog);
  return { dialog, showModal };
}

describe('openSceneOnAttach', () => {
  it('opens the modal and asks the screen to stay awake', () => {
    const requestWakeLock = vi.fn(() => Promise.resolve({ release: () => Promise.resolve() }));
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: requestWakeLock },
    });
    const { dialog, showModal } = attachedDialog();

    openSceneOnAttach(dialog);

    expect(showModal).toHaveBeenCalledOnce();
    expect(requestWakeLock).toHaveBeenCalledWith('screen');
    openSceneOnAttach(null);
    Reflect.deleteProperty(navigator, 'wakeLock');
    dialog.remove();
  });

  it('opens nothing on the detach call React makes with null', () => {
    expect(() => openSceneOnAttach(null)).not.toThrow();
  });
});
