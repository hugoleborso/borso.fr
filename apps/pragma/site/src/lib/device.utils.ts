const IOS_FAMILY_PATTERN = /iPhone|iPad|iPod/;
const MAC_USER_AGENT_MARKER = 'Macintosh';
const SINGLE_TOUCH_POINT = 1;

// @FollowsBlueprint utils-pure-module
export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  const isIphoneFamily = IOS_FAMILY_PATTERN.test(userAgent);
  const isIpadAsMac =
    userAgent.includes(MAC_USER_AGENT_MARKER) && maxTouchPoints > SINGLE_TOUCH_POINT;
  return isIphoneFamily || isIpadAsMac;
}

const DEVICE_NAME_BY_MARKER: readonly (readonly [string, string])[] = [
  ['iPad', 'iPad'],
  ['iPod', 'iPod'],
  ['iPhone', 'iPhone'],
  ['Android', 'Android'],
  ['CrOS', 'Chromebook'],
  [MAC_USER_AGENT_MARKER, 'Mac'],
  ['Windows', 'Windows'],
  ['Linux', 'Linux'],
];
const IPAD_NAME = 'iPad';

export function guessDeviceName(userAgent: string, maxTouchPoints: number): string | null {
  const isIpadAsMac =
    userAgent.includes(MAC_USER_AGENT_MARKER) && maxTouchPoints > SINGLE_TOUCH_POINT;
  if (isIpadAsMac) return IPAD_NAME;
  const match = DEVICE_NAME_BY_MARKER.find(([marker]) => userAgent.includes(marker));
  return match?.[1] ?? null;
}
