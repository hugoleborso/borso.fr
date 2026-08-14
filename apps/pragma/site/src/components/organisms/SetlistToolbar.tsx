/**
 * The band's view of the whole set, pinned to the top of the setlist editor:
 * the energy curve, the member filter, and whatever just went wrong.
 *
 * It sticks because the energy curve is the thing the operator is watching
 * while dragging rows around, and scrolling it off screen is what made the
 * curve useless on a phone. The curve shrinks under `sm` rather than
 * disappearing.
 *
 * A failure is painted here rather than in the page's flow because a
 * paragraph in the flow sits wherever the setlist happens to start, which
 * mid-drag was several hundred pixels above the viewport: a reorder failed
 * and nothing on screen changed. The two set-level actions moved the other
 * way, into the bottom bar, out of the strip a thumb cannot reach.
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { EnergySparkline } from '../molecules/EnergySparkline';
import { type FilterPillMember, MemberFilterPills } from '../molecules/MemberFilterPills';

const ENERGY_HEIGHT_COMPACT_PX = 36;
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
    <div className="sticky top-0 z-20 -mx-4 sm:-mx-9 px-4 sm:px-9 pt-1.5 pb-2 bg-bg/95 backdrop-blur border-b border-line flex flex-col gap-1.5">
      <span className="text-xs font-mono uppercase tracking-wider text-ink-400">
        {t('setlist.energy')}
      </span>
      <EnergySparkline
        values={props.energyValues}
        height={props.isCompact ? ENERGY_HEIGHT_COMPACT_PX : ENERGY_HEIGHT_PX}
      />
      <MemberFilterPills
        members={props.members}
        selectedMemberId={props.selectedMemberId}
        onChange={props.onSelectMember}
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
  );
}
