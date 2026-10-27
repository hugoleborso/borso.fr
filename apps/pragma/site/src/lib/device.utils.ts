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
