/** @Feature band */

import type { ParseKeys } from 'i18next';
import type { IconName } from '../../components/atoms/Icon';

export interface BandDestination {
  readonly to: string;
  readonly labelKey: ParseKeys;
  readonly icon: IconName;
}

// @FollowsBlueprint core-lookup-table
export const BAND_DESTINATIONS: readonly BandDestination[] = [
  { to: '/members', labelKey: 'nav.members', icon: 'audience' },
  { to: '/instruments', labelKey: 'nav.instruments', icon: 'instr' },
  { to: '/bars', labelKey: 'nav.bars', icon: 'beer' },
  { to: '/compos', labelKey: 'nav.compos', icon: 'compos' },
  { to: '/improvements', labelKey: 'nav.improvements', icon: 'bulb' },
  { to: '/studies', labelKey: 'nav.studies', icon: 'bolt' },
  { to: '/account', labelKey: 'account.title', icon: 'user' },
];
