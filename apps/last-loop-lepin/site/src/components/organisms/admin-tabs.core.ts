/**
 * The organiser screen's tabs, and which of them a missing edition blocks.
 *
 * Every tab but setup needs an edition to work on, so with none the screen
 * points the operator at setup instead of rendering an empty panel.
 */

import type { RaceEditionDto } from '../../lib/race.types';

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

export function selectTabClassName(currentTab: AdminTabName, tab: AdminTabName): string {
  if (currentTab === tab) return 'active';
  return '';
}

/** The setup tab is the only one that works without an edition to act on. */
export function isTabBlockedByMissingEdition(tab: AdminTabName, hasEdition: boolean): boolean {
  if (hasEdition) return false;
  return tab !== 'setup';
}

/**
 * Whether the race is over in practice: every registered runner is out, so
 * the standings will not move again on their own.
 */
export function isRaceOverInPractice(totalRunners: number, runnersInRace: number): boolean {
  if (totalRunners === 0) return false;
  return runnersInRace === 0;
}

/** The tab whose panel needs an edition to act on, or null for setup. */
// @FollowsBlueprint core-view-intent
export function selectEditionPanelTab(tab: AdminTabName): EditionPanelTab | null {
  if (tab === 'setup') return null;
  return tab;
}

/**
 * The edition the finish banner offers to close, if there is one. Only a live
 * edition whose registered runners are all out qualifies.
 */
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
