/**
 * The band's view of the whole set at the top of the setlist editor: the
 * member filter, the energy curve, and whatever just went wrong.
 *
 * Only the curve and the failure pin themselves, because the pinned band is
 * screen a phone does not have: the filter pills wrap onto two rows and took
 * 96 px of a 667 px screen away from the set for a control the operator
 * touches once. They scroll away with the page instead; the curve is what is
 * watched while dragging rows around, and scrolling it off screen is what made
 * it useless on a phone. Its caption goes with the pills, for the same reason —
 * a single sparkline over the set needs no label to be read as the energy
 * curve. The curve shrinks under `sm` rather than disappearing.
 *
 * The two rows are returned as a fragment rather than wrapped: a sticky
 * element only travels inside its own parent, so a wrapper around both would
 * carry the curve off the top of the screen as soon as the pills above it
 * scrolled past.
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
