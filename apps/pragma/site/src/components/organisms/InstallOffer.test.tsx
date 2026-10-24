import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import {
  captureInstallPrompt,
  INSTALL_BANNER_DISMISSED_KEY,
} from '../../lib/install-prompt.adapter';
import { InstallOffer } from './InstallOffer';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function stubShowModal(this: HTMLDialogElement): void {
  this.setAttribute('open', '');
}

Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  configurable: true,
  value: stubShowModal,
});

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const DESKTOP_CHROME =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const BANNER_TEXT = 'Install pragma as an app, for notifications and full screen';

function stubDevice(userAgent: string, isStandalone = false): void {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: isStandalone, media: query }));
}

function refuseStorageWrite(): never {
  throw new DOMException('quota exceeded', 'QuotaExceededError');
}

function resolvePrompt(): Promise<void> {
  return Promise.resolve();
}

class FakeInstallPromptEvent extends Event {
  readonly prompt = vi.fn(resolvePrompt);
  readonly userChoice: Promise<unknown>;

  constructor(outcome: string) {
    super('beforeinstallprompt', { cancelable: true });
    this.userChoice = Promise.resolve({ outcome });
  }
}

function findButton(label: string): HTMLButtonElement | null {
  const buttons = Array.from(document.body.querySelectorAll('button'));
  return (
    buttons.find(
      (button) =>
        button.textContent.trim() === label || button.getAttribute('aria-label') === label,
    ) ?? null
  );
}

// @FollowsBlueprint test-component-render
describe('InstallOffer', () => {
  let container: HTMLDivElement;
  let root: Root;
  const promptTarget = new EventTarget();
  captureInstallPrompt(promptTarget);

  function renderOffer(): void {
    act(() => {
      root.render(<InstallOffer />);
    });
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
      promptTarget.dispatchEvent(new Event('appinstalled'));
    });
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows the banner on an iPhone browser tab and walks Safari through the four steps', () => {
    stubDevice(IPHONE_SAFARI);
    renderOffer();
    expect(container.textContent).toContain(BANNER_TEXT);
    act(() => findButton('Show me')?.click());
    const dialog = container.querySelector('dialog');
    expect(dialog?.hasAttribute('open')).toBe(true);
    expect(dialog?.textContent).toContain('In Safari, tap Share.');
    expect(dialog?.textContent).toContain('Tap Add. pragma is now on your home screen.');
    expect(dialog?.textContent).not.toContain('open it in Safari');
    expect(findButton('Install')).toBeNull();
    act(() => findButton('Close')?.click());
    expect(container.querySelector('dialog')).toBeNull();
  });

  it('starts another iOS browser with opening the page in Safari', () => {
    stubDevice(IPHONE_CHROME);
    renderOffer();
    act(() => findButton('Show me')?.click());
    expect(container.querySelector('dialog')?.textContent).toContain('open it in Safari');
  });

  it('shows nothing on a desktop browser or in the installed app', () => {
    stubDevice(DESKTOP_CHROME);
    renderOffer();
    expect(container.textContent).toBe('');
    vi.unstubAllGlobals();
    stubDevice(IPHONE_SAFARI, true);
    renderOffer();
    expect(container.textContent).toBe('');
  });

  it('hides once dismissed and stays hidden on the next visit', () => {
    stubDevice(ANDROID_CHROME);
    renderOffer();
    act(() => findButton('Hide this suggestion')?.click());
    expect(container.textContent).toBe('');
    expect(localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY)).toBe('dismissed');
    act(() => root.unmount());
    root = createRoot(container);
    renderOffer();
    expect(container.textContent).toBe('');
  });

  it('hides for this visit when the storage refuses to remember the dismissal', () => {
    stubDevice(ANDROID_CHROME);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuseStorageWrite);
    renderOffer();
    act(() => findButton('Hide this suggestion')?.click());
    expect(container.textContent).toBe('');
    expect(localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY)).toBeNull();
  });

  it('offers Chrome its own prompt on Android once it was deferred, and hides after an install', async () => {
    stubDevice(ANDROID_CHROME);
    renderOffer();
    act(() => findButton('Show me')?.click());
    expect(container.querySelector('dialog')?.textContent).toContain('In Chrome, tap ⋮');
    expect(findButton('Install')).toBeNull();
    const deferred = new FakeInstallPromptEvent('accepted');
    act(() => {
      promptTarget.dispatchEvent(deferred);
    });
    await act(async () => {
      findButton('Install')?.click();
      await deferred.userChoice;
    });
    expect(deferred.prompt).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe('');
  });

  it('keeps the banner when the member declines Chrome’s prompt', async () => {
    stubDevice(ANDROID_CHROME);
    renderOffer();
    const deferred = new FakeInstallPromptEvent('dismissed');
    act(() => {
      promptTarget.dispatchEvent(deferred);
    });
    act(() => findButton('Show me')?.click());
    await act(async () => {
      findButton('Install')?.click();
      await deferred.userChoice;
    });
    expect(container.querySelector('dialog')).toBeNull();
    expect(container.textContent).toContain(BANNER_TEXT);
  });
});
