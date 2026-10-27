export type NotificationPermissionState = 'default' | 'granted' | 'denied';

export type NotificationOffer = 'install' | 'unsupported' | 'denied' | 'offer' | 'enabled';

export interface NotificationDevice {
  readonly isPushSupported: boolean;
  readonly permission: NotificationPermissionState;
  readonly isSubscribed: boolean;
  readonly isIos: boolean;
  readonly isStandalone: boolean;
}

export type EnableFailure = 'refused' | 'failed';

export interface EnableFailureFacts {
  readonly isPermissionRefusal: boolean;
}

export function selectEnableFailure(facts: EnableFailureFacts): EnableFailure {
  return facts.isPermissionRefusal ? 'refused' : 'failed';
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
