export type NotificationPermissionState = 'default' | 'granted' | 'denied';

export type NotificationOffer = 'install' | 'unsupported' | 'denied' | 'offer' | 'enabled';

export interface NotificationDevice {
  readonly isPushSupported: boolean;
  readonly permission: NotificationPermissionState;
  readonly isSubscribed: boolean;
  readonly isIos: boolean;
  readonly isStandalone: boolean;
}

const IOS_FAMILY_PATTERN = /iPhone|iPad|iPod/;
const MAC_USER_AGENT_MARKER = 'Macintosh';
const SINGLE_TOUCH_POINT = 1;

export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  const isIphoneFamily = IOS_FAMILY_PATTERN.test(userAgent);
  const isIpadAsMac =
    userAgent.includes(MAC_USER_AGENT_MARKER) && maxTouchPoints > SINGLE_TOUCH_POINT;
  return isIphoneFamily || isIpadAsMac;
}

export type EnableFailure = 'not-configured' | 'refused' | 'failed';

export interface EnableFailureFacts {
  readonly status: number | null;
  readonly isPermissionRefusal: boolean;
}

const SERVICE_UNAVAILABLE_STATUS = 503;

export function selectEnableFailure(facts: EnableFailureFacts): EnableFailure {
  if (facts.isPermissionRefusal) return 'refused';
  return facts.status === SERVICE_UNAVAILABLE_STATUS ? 'not-configured' : 'failed';
}

export function isEnableOffered(offer: NotificationOffer): boolean {
  return offer === 'offer';
}

// @FollowsBlueprint core-view-intent
export function selectNotificationOffer(device: NotificationDevice): NotificationOffer {
  if (device.isIos && !device.isStandalone) return 'install';
  if (!device.isPushSupported) return 'unsupported';
  if (device.permission === 'denied') return 'denied';
  return device.permission === 'granted' && device.isSubscribed ? 'enabled' : 'offer';
}
