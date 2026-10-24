import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  captureInstallPrompt,
  type DismissalStorage,
  INSTALL_BANNER_DISMISSED_KEY,
  promptInstall,
  readDeferredInstallPrompt,
  isInstallBannerDismissed,
  readInstallDevice,
  didStoreInstallBannerDismissal,
  subscribeToInstallPrompt,
} from './install-prompt.adapter';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130.0.0.0 Mobile';

function resolvePrompt(): Promise<void> {
  return Promise.resolve();
}

class FakeInstallPromptEvent extends Event {
  readonly prompt = vi.fn(resolvePrompt);
  readonly userChoice: Promise<unknown>;

  constructor(outcome: unknown) {
    super('beforeinstallprompt', { cancelable: true });
    this.userChoice = Promise.resolve(outcome);
  }
}

function captureOnFreshTarget(): EventTarget {
  const target = new EventTarget();
  captureInstallPrompt(target);
  return target;
}

function memoryStorage(): DismissalStorage & { readonly storedValues: Map<string, string> } {
  const storedValues = new Map<string, string>();
  return {
    storedValues,
    getItem: (key) => storedValues.get(key) ?? null,
    setItem: (key, value) => {
      storedValues.set(key, value);
    },
  };
}

const REFUSING_STORAGE: DismissalStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('install-prompt.adapter', () => {
  afterEach(() => {
    captureOnFreshTarget().dispatchEvent(new Event('appinstalled'));
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('keeps the deferred prompt, cancels the mini infobar and tells the subscribers', () => {
    const target = captureOnFreshTarget();
    const onChange = vi.fn();
    const unsubscribe = subscribeToInstallPrompt(onChange);
    const event = new FakeInstallPromptEvent({ outcome: 'accepted' });
    target.dispatchEvent(event);
    expect(readDeferredInstallPrompt()).toBe(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
    target.dispatchEvent(new Event('appinstalled'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(readDeferredInstallPrompt()).toBeNull();
  });

  it('ignores an event that carries no prompt to show', () => {
    const target = captureOnFreshTarget();
    const promptless = new Event('beforeinstallprompt', { cancelable: true });
    target.dispatchEvent(promptless);
    expect(readDeferredInstallPrompt()).toBeNull();
    expect(promptless.defaultPrevented).toBe(false);
  });

  it('ignores an event whose prompt is not a function or whose choice is not a promise', () => {
    const target = captureOnFreshTarget();
    const promptNotCallable = Object.assign(new Event('beforeinstallprompt'), {
      prompt: 'nope',
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    const choiceMissing = Object.assign(new Event('beforeinstallprompt'), {
      prompt: () => Promise.resolve(),
    });
    const choiceNotPromise = Object.assign(new Event('beforeinstallprompt'), {
      prompt: () => Promise.resolve(),
      userChoice: { outcome: 'accepted' },
    });
    target.dispatchEvent(promptNotCallable);
    target.dispatchEvent(choiceMissing);
    target.dispatchEvent(choiceNotPromise);
    expect(readDeferredInstallPrompt()).toBeNull();
  });

  it('captures from the window when no target is given', () => {
    captureInstallPrompt();
    const event = new FakeInstallPromptEvent({ outcome: 'dismissed' });
    window.dispatchEvent(event);
    expect(readDeferredInstallPrompt()).toBe(event);
  });

  it('opens the prompt once, forgets it, and answers what the member chose', async () => {
    const target = captureOnFreshTarget();
    const accepted = new FakeInstallPromptEvent({ outcome: 'accepted' });
    target.dispatchEvent(accepted);
    expect(await promptInstall(accepted)).toBe('accepted');
    expect(accepted.prompt).toHaveBeenCalledTimes(1);
    expect(readDeferredInstallPrompt()).toBeNull();
    expect(await promptInstall(new FakeInstallPromptEvent({ outcome: 'dismissed' }))).toBe(
      'dismissed',
    );
  });

  it('reads an unrecognised choice as a dismissal', async () => {
    expect(await promptInstall(new FakeInstallPromptEvent({ outcome: 'later' }))).toBe('dismissed');
    expect(await promptInstall(new FakeInstallPromptEvent(undefined))).toBe('dismissed');
  });

  it('reads the device from the display environment it is given', () => {
    const tab = {
      userAgent: ANDROID,
      maxTouchPoints: 5,
      isHomeScreenApp: false,
      matchesStandaloneDisplay: false,
    };
    expect(readInstallDevice(tab)).toEqual({
      userAgent: ANDROID,
      maxTouchPoints: 5,
      isStandalone: false,
    });
    expect(readInstallDevice({ ...tab, matchesStandaloneDisplay: true }).isStandalone).toBe(true);
  });

  it('reads the device from the browser when no environment is given', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query }));
    const device = readInstallDevice();
    expect(device.userAgent).toBe(navigator.userAgent);
    expect(device.maxTouchPoints).toBe(navigator.maxTouchPoints);
    expect(device.isStandalone).toBe(true);
  });

  it('remembers the dismissal in the storage it is given', () => {
    const storage = memoryStorage();
    const readStorage = () => storage;
    expect(isInstallBannerDismissed(readStorage)).toBe(false);
    expect(didStoreInstallBannerDismissal(readStorage)).toBe(true);
    expect(storage.storedValues.get(INSTALL_BANNER_DISMISSED_KEY)).toBe('dismissed');
    expect(isInstallBannerDismissed(readStorage)).toBe(true);
  });

  it('does not read another value under the key as a dismissal', () => {
    const storage = memoryStorage();
    storage.setItem(INSTALL_BANNER_DISMISSED_KEY, 'true');
    expect(isInstallBannerDismissed(() => storage)).toBe(false);
  });

  it('defaults to the browser local storage', () => {
    expect(isInstallBannerDismissed()).toBe(false);
    expect(didStoreInstallBannerDismissal()).toBe(true);
    expect(localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY)).toBe('dismissed');
    expect(isInstallBannerDismissed()).toBe(true);
  });

  it('treats a storage that refuses as never dismissed, so the banner comes back', () => {
    expect(isInstallBannerDismissed(() => REFUSING_STORAGE)).toBe(false);
    expect(didStoreInstallBannerDismissal(() => REFUSING_STORAGE)).toBe(false);
  });

  it('treats a browser that blocks local storage itself as having no storage', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(isInstallBannerDismissed()).toBe(false);
    expect(didStoreInstallBannerDismissal()).toBe(false);
  });
});
