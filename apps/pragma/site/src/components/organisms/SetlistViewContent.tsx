/** @Feature setlists */

import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../molecules/EmptyState';
import { MemberChip } from '../molecules/MemberChip';
import type { LineupGrid } from './lineup-grid.core';
import { SetlistLineupGrid } from './SetlistLineupGrid';

export type SetlistViewName = 'songs' | 'lineup' | 'my-part';

export interface SetlistViewMember {
  readonly firstName: string;
  readonly color: string;
}

export interface SetlistViewContentProps {
  readonly view: SetlistViewName;
  readonly entriesList: ReactNode;
  readonly entryIds: readonly string[];
  readonly memberEntryIds: readonly string[];
  readonly shownMember: SetlistViewMember | undefined;
  readonly lineupGrid: LineupGrid;
  readonly onOpenLineupCell: (entryId: string) => void;
  readonly onOpenMember: (memberId: string) => void;
}

// @FollowsBlueprint organism-presentational
export function SetlistViewContent(props: SetlistViewContentProps): JSX.Element {
  const { t } = useTranslation();
  const contentByView = {
    songs:
      props.entryIds.length === 0 ? (
        <EmptyState icon="setlist">{t('setlist.emptyList')}</EmptyState>
      ) : (
        props.entriesList
      ),
    lineup:
      props.lineupGrid.columns.length === 0 ? (
        <EmptyState icon="members">{t('setlist.lineupEmpty')}</EmptyState>
      ) : (
        <SetlistLineupGrid
          grid={props.lineupGrid}
          onOpenCell={props.onOpenLineupCell}
          onOpenMember={props.onOpenMember}
        />
      ),
    'my-part': (
      <div className="flex flex-col gap-2">
        {props.shownMember === undefined ? null : (
          <MemberChip
            memberName={props.shownMember.firstName}
            memberColor={props.shownMember.color}
            size="md"
            withName
          />
        )}
        {props.memberEntryIds.length === 0 ? (
          <EmptyState icon="members">{t('lineup.emptyForMember')}</EmptyState>
        ) : (
          props.entriesList
        )}
      </div>
    ),
  } as const;
  return <>{contentByView[props.view]}</>;
}
