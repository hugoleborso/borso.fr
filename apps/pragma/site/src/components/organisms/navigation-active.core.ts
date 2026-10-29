/** @Feature shell */

import type { ParseKeys } from 'i18next';
import type { IconName } from '../atoms/Icon';

export type ShellTabId = 'home' | 'sessions' | 'songs' | 'band';

export interface ShellTab {
  readonly id: ShellTabId;
  readonly to: string;
  readonly labelKey: ParseKeys;
  readonly icon: IconName;
}

export const SHELL_TABS: readonly ShellTab[] = [
  { id: 'home', to: '/', labelKey: 'nav.home', icon: 'home' },
  { id: 'sessions', to: '/sessions', labelKey: 'nav.sessions', icon: 'sessions' },
  { id: 'songs', to: '/catalog', labelKey: 'nav.songs', icon: 'song' },
  { id: 'band', to: '/band', labelKey: 'nav.band', icon: 'members' },
];

const HOME_PATH = '/';
const PATH_SEPARATOR = '/';

const DESTINATIONS_BY_TAB: readonly (readonly [ShellTabId, readonly string[]])[] = [
  ['sessions', ['/sessions', '/setlists']],
  ['songs', ['/catalog']],
  [
    'band',
    [
      '/band',
      '/tasks',
      '/members',
      '/instruments',
      '/bars',
      '/compos',
      '/improvements',
      '/account',
    ],
  ],
];

function isAtOrBelow(pathname: string, destination: string): boolean {
  return pathname === destination || pathname.startsWith(`${destination}${PATH_SEPARATOR}`);
}

// @FollowsBlueprint core-decision
export function selectActiveTab(pathname: string): ShellTabId | null {
  if (pathname === HOME_PATH) return 'home';
  const holder = DESTINATIONS_BY_TAB.find(([, destinations]) =>
    destinations.some((destination) => isAtOrBelow(pathname, destination)),
  );
  return holder?.[0] ?? null;
}
