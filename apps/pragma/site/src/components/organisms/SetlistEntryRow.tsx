/** @Feature setlists */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlbumCover } from '../atoms/AlbumCover';
import { composeClassName } from '../atoms/class-name.utils';
import { IconButton } from '../atoms/IconButton';
import { ConfirmDialog } from '../molecules/ConfirmDialog';
import { LineupSlots } from '../molecules/LineupSlots';
import { ListRow } from '../molecules/ListRow';
import { type LineupColumnView, naturalColumnWidth } from '../molecules/lineup-slots.core';
import { MemberPartGlyphs, type MemberPartGlyph } from '../molecules/MemberPartGlyphs';
import { Menu } from '../molecules/Menu';

const POSITION_DIGITS = 2;
const DRAG_HANDLE_CLASS = 'shrink-0 cursor-grab touch-none text-ink-faint active:cursor-grabbing';
const TITLE_CLASS = 'block truncate font-display text-title text-ink';
const CHANGE_CLASS = 'self-start rounded-sm bg-highlight px-1.5 py-0.5 text-meta text-on-highlight';
const CHANGE_SEPARATOR = ' · ';

export interface SetlistEntryLineupChange {
  readonly memberId: string;
  readonly firstName: string;
  readonly heldInstrumentNames: readonly string[];
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
  readonly memberPart: readonly MemberPartGlyph[];
  readonly isMemberView: boolean;
  readonly transitionBefore: ReactNode;
  readonly onOpen: () => void;
  readonly onRemove: (entryId: string) => void;
}

// @FollowsBlueprint organism-presentational
export function SetlistEntryRow(props: SetlistEntryRowProps): JSX.Element {
  const { t } = useTranslation();
  const [isRemovalPending, setIsRemovalPending] = useState<boolean>(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.entryId,
  });
  const keyParts = [
    props.keyLabel,
    props.capo === null ? null : t('setlist.capoValue', { capo: props.capo }),
  ].filter((part) => part !== null);
  const changeLabel = props.lineupChanges
    .map((change) =>
      change.heldInstrumentNames.length === 0
        ? t('setlist.sitsOutTonight', { name: change.firstName })
        : `${change.firstName}: ${change.heldInstrumentNames.join(', ')}`,
    )
    .join(CHANGE_SEPARATOR);
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={composeClassName('flex flex-col', isDragging && 'opacity-40')}
    >
      {props.transitionBefore}
      <div className="flex items-start gap-1 border-b border-rule py-1.5">
        <IconButton
          icon="drag"
          label={t('setlist.dragHandle')}
          size="sm"
          className={DRAG_HANDLE_CLASS}
          {...attributes}
          {...listeners}
        />
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
                <MemberPartGlyphs parts={props.memberPart} size="md" />
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
              <span className={CHANGE_CLASS}>
                {t('setlist.tonightChange', { change: changeLabel })}
              </span>
            </span>
          )}
        </ListRow>
        <Menu
          label={t('setlist.entryActions', { title: props.title })}
          items={[
            {
              label: t('setlist.removeFromSetlist'),
              icon: 'trash',
              tone: 'danger',
              onSelect: () => setIsRemovalPending(true),
            },
          ]}
        />
      </div>
      {isRemovalPending ? (
        <ConfirmDialog
          question={t('setlist.removeConfirm', { title: props.title })}
          confirmLabel={t('setlist.removeFromSetlist')}
          onConfirm={() => {
            setIsRemovalPending(false);
            props.onRemove(props.entryId);
          }}
          onCancel={() => setIsRemovalPending(false)}
        />
      ) : null}
    </li>
  );
}
