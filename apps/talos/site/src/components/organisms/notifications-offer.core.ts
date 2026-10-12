export type NotificationPermissionState = 'default' | 'granted' | 'denied';

export type NotificationOffer = 'unsupported' | 'offer' | 'denied' | 'enabled';

// @FollowsBlueprint core-view-intent
export function selectNotificationOffer(
  isSupported: boolean,
  permission: NotificationPermissionState,
  isSubscribed: boolean,
): NotificationOffer {
  if (!isSupported) return 'unsupported';
  if (permission === 'denied') return 'denied';
  return permission === 'granted' && isSubscribed ? 'enabled' : 'offer';
}

export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  const isIphoneFamily = /iPhone|iPad|iPod/.test(userAgent);
  const isIpadAsMac = userAgent.includes('Macintosh') && maxTouchPoints > 1;
  return isIphoneFamily || isIpadAsMac;
}

export function shouldShowInstallHint(isIos: boolean, isStandalone: boolean): boolean {
  return isIos && !isStandalone;
}
