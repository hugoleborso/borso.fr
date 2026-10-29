/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { LineupEditorMember } from './lineup-editor.core';
import { LineupMemberRow, type LineupMemberRowInstrument } from './LineupMemberRow';

export interface SongLineupFieldsProps {
  readonly members: readonly LineupEditorMember[];
  readonly instruments: readonly LineupMemberRowInstrument[];
  readonly lineup: Readonly<Record<string, readonly string[]>>;
  readonly onToggle: (memberId: string, instrumentId: string) => void;
}

// @FollowsBlueprint molecule-presentational
export function SongLineupFields({
  members,
  instruments,
  lineup,
  onToggle,
}: SongLineupFieldsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <ul aria-label={t('catalog.defaultLineup')} className="m-0 flex list-none flex-col gap-4 p-0">
      {members.map((member) => (
        <LineupMemberRow
          key={member.id}
          member={member}
          instruments={instruments}
          heldInstrumentIds={lineup[member.id] ?? []}
          onToggle={(instrumentId) => onToggle(member.id, instrumentId)}
        />
      ))}
    </ul>
  );
}
