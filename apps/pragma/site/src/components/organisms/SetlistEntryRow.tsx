/** @Feature setlists */

import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlbumCover } from '../atoms/AlbumCover';
import { MemberMark } from '../atoms/MemberMark';
import { LineupSlots } from '../molecules/LineupSlots';
import { ListRow } from '../molecules/ListRow';
import { type LineupColumnView, naturalColumnWidth } from '../molecules/lineup-slots.core';
import { HeldInstrumentGlyphs, type HeldInstrumentGlyph } from '../molecules/HeldInstrumentGlyphs';
import { Menu, type MenuItem } from '../molecules/Menu';

const POSITION_DIGITS = 2;
const TITLE_CLASS = 'block truncate font-display text-title text-ink';
const CHANGE_CLASS =
  'inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm bg-highlight px-1.5 py-0.5';
const CHANGE_SEPARATOR = ' · ';

export interface SetlistEntryLineupChange {
  readonly memberId: string;
  readonly firstName: string;
  readonly color: string;
  readonly heldInstruments: readonly HeldInstrumentGlyph[];
}

export interface SetlistEntryRowProps {
  readonly position: number;
  readonly entryId: string;
  readonly title: string;
  readonly artist: string;
  readonly deezerAlbumId: string | null;
  readonly keyLabel: string | null;
  readonly capo: number | null;
  readonly notes: string;
  readonly lineupColumn: LineupColumnView;
  readonly lineupChanges: readonly SetlistEntryLineupChange[];
  readonly heldInstruments: readonly HeldInstrumentGlyph[];
  readonly isMemberView: boolean;
  readonly transitionBefore: ReactNode;
  readonly onOpen: () => void;
  readonly onRemove: (entryId: string) => void;
  readonly onAddBreakAfter?: (entryId: string) => void;
}

// @FollowsBlueprint organism-presentational
export function SetlistEntryRow(props: SetlistEntryRowProps): JSX.Element {
  const { t } = useTranslation();
  const keyParts = [
    props.keyLabel,
    props.capo === null ? null : t('setlist.capoValue', { capo: props.capo }),
  ].filter((part) => part !== null);
  const changeLabel = props.lineupChanges
    .map((change) =>
      change.heldInstruments.length === 0
        ? t('setlist.sitsOutTonight', { name: change.firstName })
        : `${change.firstName}: ${change.heldInstruments.map((instrument) => instrument.name).join(', ')}`,
    )
    .join(CHANGE_SEPARATOR);
  const changeSentence = t('setlist.tonightChange', { change: changeLabel });
  const { onAddBreakAfter } = props;
  const addBreakItems: MenuItem[] =
    onAddBreakAfter === undefined
      ? []
      : [
          {
            label: t('setlist.break.addAfter'),
            icon: 'pause',
            tone: 'default',
            onSelect: () => onAddBreakAfter(props.entryId),
          },
        ];
  return (
    <li className="flex flex-col">
      {props.transitionBefore}
      <div className="flex items-start gap-1 border-b border-rule py-1.5">
        <ListRow
          onClick={props.onOpen}
          isChevronShown={false}
          className="min-w-0 flex-1 flex-col items-stretch gap-1"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="w-5 shrink-0 text-right font-mono text-label text-ink-faint">
              {String(props.position).padStart(POSITION_DIGITS, '0')}
            </span>
            <AlbumCover title={props.title} deezerAlbumId={props.deezerAlbumId} size="sm" />
            <span className="block min-w-0 flex-auto">
              <span className={TITLE_CLASS}>{props.title}</span>
              <span className="flex min-w-0 items-center gap-1.5 text-label text-ink-soft">
                {props.isMemberView ? null : (
                  <span
                    className="inline-flex min-w-6 shrink"
                    style={{ flexBasis: naturalColumnWidth(props.lineupColumn) }}
                  >
                    <LineupSlots column={props.lineupColumn} />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">
                  {props.artist}
                  {keyParts.length === 0 ? null : (
                    <span className="font-mono">{` · ${keyParts.join(' · ')}`}</span>
                  )}
                </span>
              </span>
            </span>
            {props.isMemberView ? (
              <span className="flex shrink-0 items-center pr-1">
                <HeldInstrumentGlyphs instruments={props.heldInstruments} size="md" />
              </span>
            ) : null}
          </span>
          {props.notes.length === 0 ? null : (
            <span className="pl-7 font-display text-body leading-snug text-ink italic">
              {props.notes}
            </span>
          )}
          {changeLabel.length === 0 ? null : (
            <span className="flex pl-7">
              <span
                role="img"
                aria-label={changeSentence}
                title={changeSentence}
                className={CHANGE_CLASS}
              >
                {props.lineupChanges.map((change) => (
                  <span
                    key={change.memberId}
                    data-lineup-change={change.memberId}
                    aria-hidden="true"
                    className="inline-flex items-center gap-1.5"
                  >
                    <MemberMark
                      shape={change.heldInstruments.length === 0 ? 'ring' : 'dot'}
                      color={change.color}
                    />
                    {change.heldInstruments.length === 0 ? null : (
                      <HeldInstrumentGlyphs instruments={change.heldInstruments} size="sm" />
                    )}
                  </span>
                ))}
              </span>
            </span>
          )}
        </ListRow>
        <Menu
          label={t('setlist.entryActions', { title: props.title })}
          items={[
            ...addBreakItems,
            {
              label: t('setlist.removeFromSetlist'),
              icon: 'trash',
              tone: 'danger',
              onSelect: () => props.onRemove(props.entryId),
            },
          ]}
        />
      </div>
    </li>
  );
}
