/** @Feature members */

import type { InstrumentIcon } from '@domain/instrument.core';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Chip } from '../atoms/Chip';
import { Icon } from '../atoms/Icon';
import type { LineupEditorMember } from './lineup-editor.core';
import { INSTRUMENT_ICON_GLYPH, selectInstrumentIdsNamedInWords } from './lineup-slots.core';
import { MemberChip } from './MemberChip';

export interface LineupMemberRowInstrument {
  readonly id: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
}

export interface LineupMemberRowProps {
  readonly member: LineupEditorMember;
  readonly instruments: readonly LineupMemberRowInstrument[];
  readonly heldInstrumentIds: readonly string[];
  readonly onToggle: (instrumentId: string) => void;
}

// @FollowsBlueprint molecule-presentational
export function LineupMemberRow({
  member,
  instruments,
  heldInstrumentIds,
  onToggle,
}: LineupMemberRowProps): JSX.Element {
  const { t } = useTranslation();
  const isSittingOut = heldInstrumentIds.length === 0;
  const namedInWords = selectInstrumentIdsNamedInWords(instruments);
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <MemberChip memberName={member.name} memberColor={member.color} size="xs" withName />
      </div>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={`${member.name} — ${t('lineup.instruments')}`}
      >
        {instruments.map((instrument) => (
          <Chip
            key={instrument.id}
            pressed={heldInstrumentIds.includes(instrument.id)}
            onPress={() => onToggle(instrument.id)}
            aria-label={instrument.name}
            title={instrument.name}
          >
            <Icon name={INSTRUMENT_ICON_GLYPH[instrument.icon]} />
            {namedInWords.has(instrument.id) ? instrument.name : null}
          </Chip>
        ))}
        {isSittingOut ? (
          <span className="self-center pl-1 text-meta text-ink-soft">{t('lineup.notPlaying')}</span>
        ) : null}
      </div>
    </li>
  );
}
