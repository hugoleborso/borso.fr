/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { EnergySparkline } from '../molecules/EnergySparkline';
import { type FilterPillMember, MemberFilterPills } from '../molecules/MemberFilterPills';

const ENERGY_HEIGHT_COMPACT_PX = 56;
const ENERGY_HEIGHT_PX = 72;

export interface SetlistToolbarProps {
  readonly energyValues: readonly (number | null)[];
  readonly isCompact: boolean;
  readonly members: readonly FilterPillMember[];
  readonly selectedMemberId: string | null;
  readonly failureMessage: string | null;
  readonly onSelectMember: (memberId: string | null) => void;
}

// @FollowsBlueprint organism-presentational
export function SetlistToolbar(props: SetlistToolbarProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <MemberFilterPills
        members={props.members}
        selectedMemberId={props.selectedMemberId}
        onChange={props.onSelectMember}
      />
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-9 px-4 sm:px-9 pt-1.5 pb-2 bg-bg/95 backdrop-blur border-b border-line flex flex-col gap-1.5">
        <span className="hidden sm:block text-xs font-mono uppercase tracking-wider text-ink-400">
          {t('setlist.energy')}
        </span>
        <EnergySparkline
          values={props.energyValues}
          height={props.isCompact ? ENERGY_HEIGHT_COMPACT_PX : ENERGY_HEIGHT_PX}
        />
        {props.failureMessage === null ? null : (
          <p
            className="m-0 text-danger text-sm border border-danger/40 rounded-md px-3 py-2"
            role="alert"
          >
            {props.failureMessage}
          </p>
        )}
      </div>
    </>
  );
}
