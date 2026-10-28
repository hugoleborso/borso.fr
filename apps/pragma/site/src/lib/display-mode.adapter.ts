/** @DependsOnExternal browser-media-query */

import { type CalendarPlatform, selectCalendarPlatform } from './calendar-guide.utils';
import { isIosDevice } from './device.utils';

export interface DisplayEnvironment {
  readonly userAgent: string;
  readonly maxTouchPoints: number;
  readonly isHomeScreenApp: boolean;
  readonly matchesStandaloneDisplay: boolean;
}

export interface InstallContext {
  readonly isIos: boolean;
  readonly isStandalone: boolean;
}

const STANDALONE_DISPLAY_QUERY = '(display-mode: standalone)';

// @FollowsBlueprint injected-browser-api
export function readBrowserDisplayEnvironment(): DisplayEnvironment {
  return {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    isHomeScreenApp: 'standalone' in navigator && navigator.standalone === true,
    matchesStandaloneDisplay: window.matchMedia(STANDALONE_DISPLAY_QUERY).matches,
  };
}

export function readInstallContext(
  environment: DisplayEnvironment = readBrowserDisplayEnvironment(),
): InstallContext {
  return {
    isIos: isIosDevice(environment.userAgent, environment.maxTouchPoints),
    isStandalone: environment.isHomeScreenApp || environment.matchesStandaloneDisplay,
  };
}

export function readCalendarPlatform(
  environment: DisplayEnvironment = readBrowserDisplayEnvironment(),
): CalendarPlatform {
  return selectCalendarPlatform(environment.userAgent, environment.maxTouchPoints);
}
