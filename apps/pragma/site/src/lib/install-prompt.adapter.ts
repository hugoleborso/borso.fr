/**
 * @Feature install-offer
 * @DependsOnExternal browser-install-prompt
 * @DependsOnExternal browser-local-storage
 */

import { z } from 'zod';
import type { InstallChoice } from './install-offer.utils';
import {
  type DisplayEnvironment,
  readBrowserDisplayEnvironment,
  readInstallContext,
} from './display-mode.adapter';

export interface DeferredInstallPrompt {
  readonly prompt: () => Promise<unknown>;
  readonly userChoice: Promise<unknown>;
}

export interface InstallPromptTarget {
  readonly addEventListener: (type: string, listener: (event: Event) => void) => void;
}

export interface DismissalStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
}

export interface InstallDevice {
  readonly userAgent: string;
  readonly maxTouchPoints: number;
  readonly isStandalone: boolean;
}

const BEFORE_INSTALL_PROMPT_EVENT = 'beforeinstallprompt';
const APP_INSTALLED_EVENT = 'appinstalled';
export const INSTALL_BANNER_DISMISSED_KEY = 'pragma.installBannerDismissed';
const DISMISSED_VALUE = 'dismissed';

const userChoiceSchema = z.object({ outcome: z.enum(['accepted', 'dismissed']) });

const installPromptStore: { current: DeferredInstallPrompt | null } = { current: null };
const installPromptListeners = new Set<() => void>();

function publishInstallPrompt(next: DeferredInstallPrompt | null): void {
  installPromptStore.current = next;
  for (const listener of installPromptListeners) listener();
}

function isDeferredInstallPrompt(event: Event): event is Event & DeferredInstallPrompt {
  return (
    'prompt' in event &&
    typeof event.prompt === 'function' &&
    'userChoice' in event &&
    event.userChoice instanceof Promise
  );
}

function readBrowserStorage(): DismissalStorage {
  return window.localStorage;
}

// @FollowsBlueprint injected-browser-api
export function captureInstallPrompt(target: InstallPromptTarget = window): void {
  target.addEventListener(BEFORE_INSTALL_PROMPT_EVENT, (event) => {
    if (!isDeferredInstallPrompt(event)) return;
    event.preventDefault();
    publishInstallPrompt(event);
  });
  target.addEventListener(APP_INSTALLED_EVENT, () => publishInstallPrompt(null));
}

export function subscribeToInstallPrompt(onStoreChange: () => void): () => void {
  installPromptListeners.add(onStoreChange);
  return () => {
    installPromptListeners.delete(onStoreChange);
  };
}

export function readDeferredInstallPrompt(): DeferredInstallPrompt | null {
  return installPromptStore.current;
}

export async function promptInstall(installPrompt: DeferredInstallPrompt): Promise<InstallChoice> {
  publishInstallPrompt(null);
  await installPrompt.prompt();
  const choice = userChoiceSchema.safeParse(await installPrompt.userChoice);
  return choice.success ? choice.data.outcome : 'dismissed';
}

export function readInstallDevice(
  environment: DisplayEnvironment = readBrowserDisplayEnvironment(),
): InstallDevice {
  return {
    userAgent: environment.userAgent,
    maxTouchPoints: environment.maxTouchPoints,
    isStandalone: readInstallContext(environment).isStandalone,
  };
}

export function isInstallBannerDismissed(
  readStorage: () => DismissalStorage = readBrowserStorage,
): boolean {
  try {
    return readStorage().getItem(INSTALL_BANNER_DISMISSED_KEY) === DISMISSED_VALUE;
  } catch {
    return false;
  }
}

export function didStoreInstallBannerDismissal(
  readStorage: () => DismissalStorage = readBrowserStorage,
): boolean {
  try {
    readStorage().setItem(INSTALL_BANNER_DISMISSED_KEY, DISMISSED_VALUE);
    return true;
  } catch {
    return false;
  }
}
