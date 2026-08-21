import type { RaceEditionDto } from '../../lib/race.types';
import type { NavigationItemState } from '../../routes/route.core';

export type AdminTabName = 'setup' | 'runners' | 'punch' | 'did-not-finish' | 'corrections';

export type EditionPanelTab = Exclude<AdminTabName, 'setup'>;

export interface AdminTab {
  readonly name: AdminTabName;
  readonly labelKey:
    | 'admin.tab.setup'
    | 'admin.tab.runners'
    | 'admin.tab.punch'
    | 'admin.tab.did-not-finish'
    | 'admin.tab.corrections';
}

// @FollowsBlueprint data-module
export const ADMIN_TABS: readonly AdminTab[] = [
  { name: 'setup', labelKey: 'admin.tab.setup' },
  { name: 'runners', labelKey: 'admin.tab.runners' },
  { name: 'punch', labelKey: 'admin.tab.punch' },
  { name: 'did-not-finish', labelKey: 'admin.tab.did-not-finish' },
  { name: 'corrections', labelKey: 'admin.tab.corrections' },
];

export const DEFAULT_ADMIN_TAB: AdminTabName = 'punch';

export function selectTabState(currentTab: AdminTabName, tab: AdminTabName): NavigationItemState {
  if (currentTab === tab) return 'active';
  return 'inactive';
}

export function isTabBlockedByMissingEdition(tab: AdminTabName, hasEdition: boolean): boolean {
  if (hasEdition) return false;
  return tab !== 'setup';
}

export function isRaceOverInPractice(totalRunners: number, runnersInRace: number): boolean {
  if (totalRunners === 0) return false;
  return runnersInRace === 0;
}

// @FollowsBlueprint core-view-intent
export function selectEditionPanelTab(tab: AdminTabName): EditionPanelTab | null {
  if (tab === 'setup') return null;
  return tab;
}

export function selectEditionNeedingFinish(
  edition: RaceEditionDto | null,
  totalRunners: number,
  runnersInRace: number,
): RaceEditionDto | null {
  if (edition === null) return null;
  if (edition.status !== 'live') return null;
  if (!isRaceOverInPractice(totalRunners, runnersInRace)) return null;
  return edition;
}
