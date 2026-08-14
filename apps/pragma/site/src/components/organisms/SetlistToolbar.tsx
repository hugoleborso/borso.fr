/**
 * The band's view of the whole set, pinned to the top of the setlist editor:
 * the energy curve, the member filter, and the two actions that act on the
 * set rather than on a row — add a song, copy the running order.
 *
 * It sticks because the energy curve is the thing the operator is watching
 * while dragging rows around, and scrolling it off screen is what made the
 * curve useless on a phone. The curve shrinks under `sm` rather than
 * disappearing.
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { EnergySparkline } from '../molecules/EnergySparkline';
import { type FilterPillMember, MemberFilterPills } from '../molecules/MemberFilterPills';

const ENERGY_HEIGHT_COMPACT_PX = 44;
const ENERGY_HEIGHT_PX = 72;

export interface SetlistToolbarProps {
  readonly energyValues: readonly (number | null)[];
  readonly isCompact: boolean;
  readonly members: readonly FilterPillMember[];
  readonly selectedMemberId: string | null;
  readonly entryCount: number;
  readonly isOrderCopied: boolean;
  readonly onSelectMember: (memberId: string | null) => void;
  readonly onAddSong: () => void;
  readonly onCopyOrder: () => void;
}

// @FollowsBlueprint organism-presentational
export function SetlistToolbar(props: SetlistToolbarProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="sticky top-0 z-20 -mx-4 sm:-mx-9 px-4 sm:px-9 pt-2 pb-3 bg-bg/95 backdrop-blur border-b border-line flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-mono uppercase tracking-wider text-ink-400">
          {t('setlist.energy')}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={props.onCopyOrder}
            disabled={props.entryCount === 0}
          >
            <Icon name={props.isOrderCopied ? 'check' : 'text'} size={14} />
            {props.isOrderCopied ? t('setlist.orderCopied') : t('setlist.copyOrder')}
          </Button>
          <Button variant="accent" size="sm" onClick={props.onAddSong}>
            <Icon name="plus" size={14} />
            {t('setlist.addSong')}
          </Button>
        </div>
      </div>
      <EnergySparkline
        values={props.energyValues}
        height={props.isCompact ? ENERGY_HEIGHT_COMPACT_PX : ENERGY_HEIGHT_PX}
      />
      <MemberFilterPills
        members={props.members}
        selectedMemberId={props.selectedMemberId}
        onChange={props.onSelectMember}
      />
    </div>
  );
}
