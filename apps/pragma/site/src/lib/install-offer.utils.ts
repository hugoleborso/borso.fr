/** @Feature install-offer */

import { isIosDevice } from './device.utils';

export type InstallChoice = 'accepted' | 'dismissed';

export type InstallWalkthrough = 'ios-safari' | 'ios-other-browser' | 'android';

export type InstallStep =
  | 'open-in-safari'
  | 'tap-share'
  | 'scroll-share-sheet'
  | 'tap-add-to-home-screen'
  | 'confirm-add'
  | 'tap-browser-menu'
  | 'tap-install-app'
  | 'confirm-install';

export interface InstallOfferDevice {
  readonly userAgent: string;
  readonly maxTouchPoints: number;
  readonly isStandalone: boolean;
  readonly isDismissed: boolean;
}

const ANDROID_MARKER = 'Android';
const IOS_OTHER_BROWSER_PATTERN = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|DuckDuckGo/;

const IOS_SAFARI_STEPS: readonly InstallStep[] = [
  'tap-share',
  'scroll-share-sheet',
  'tap-add-to-home-screen',
  'confirm-add',
];

const STEPS_BY_WALKTHROUGH: Readonly<Record<InstallWalkthrough, readonly InstallStep[]>> = {
  'ios-safari': IOS_SAFARI_STEPS,
  'ios-other-browser': ['open-in-safari', ...IOS_SAFARI_STEPS],
  android: ['tap-browser-menu', 'tap-install-app', 'confirm-install'],
};

function selectDeviceWalkthrough(
  userAgent: string,
  maxTouchPoints: number,
): InstallWalkthrough | null {
  if (isIosDevice(userAgent, maxTouchPoints)) {
    return IOS_OTHER_BROWSER_PATTERN.test(userAgent) ? 'ios-other-browser' : 'ios-safari';
  }
  return userAgent.includes(ANDROID_MARKER) ? 'android' : null;
}

// @FollowsBlueprint utils-pure-module
export function selectInstallWalkthrough(device: InstallOfferDevice): InstallWalkthrough | null {
  if (device.isStandalone || device.isDismissed) return null;
  return selectDeviceWalkthrough(device.userAgent, device.maxTouchPoints);
}

export function installStepsOf(walkthrough: InstallWalkthrough): readonly InstallStep[] {
  return STEPS_BY_WALKTHROUGH[walkthrough];
}

export function isNativeInstallOffered(
  walkthrough: InstallWalkthrough,
  hasDeferredPrompt: boolean,
): boolean {
  return walkthrough === 'android' && hasDeferredPrompt;
}

export function isInstallAccepted(choice: InstallChoice): boolean {
  return choice === 'accepted';
}
