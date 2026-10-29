/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../atoms/Icon';
import { ListRow } from '../molecules/ListRow';
import type { LineupMember } from '../molecules/MemberLineup';
import { warnIfOrphanMemberIds } from './orphan-member-warn.adapter';
import { type SetlistEntryLineupChange, SetlistEntryRow } from './SetlistEntryRow';
import {
  compactLineup,
  lineupOf,
  type SetlistEditorEntry,
  type SetlistEditorSong,
  tonalityLabelFor,
} from './setlist-editor.utils';
import { buildLineupColumn, type SlotInstrument } from '../molecules/lineup-slots.core';
import { TransitionStrip } from './TransitionStrip';
import { type TransitionView, transitionPairKey } from './transition-view.core';
import type { MemberPartGlyph } from '../molecules/MemberPartGlyphs';

const NO_MEMBER_PART: readonly MemberPartGlyph[] = [];
const NO_CHANGE: readonly SetlistEntryLineupChange[] = [];
const SONG_ID_FALLBACK_LENGTH = 8;
const POSITION_DIGITS = 2;

interface ListEntry extends SetlistEditorEntry {
  readonly id: string;
  readonly keyOverride: string | null;
  readonly capo: number | null;
  readonly notes: string;
}

export interface SetlistEntriesListProps {
  readonly entries: readonly ListEntry[];
  readonly visibleEntries: readonly ListEntry[];
  readonly songsById: Readonly<Record<string, SetlistEditorSong>>;
  readonly transitionViews: readonly TransitionView[];
  readonly transitionNotesByPair: Readonly<Record<string, string>>;
  readonly inFilteredMode: boolean;
  readonly memberPartByEntryId: Readonly<Record<string, readonly MemberPartGlyph[]>>;
  readonly lineupMembers: readonly LineupMember[];
  readonly slotInstruments: readonly SlotInstrument[];
  readonly knownMemberIds: ReadonlySet<string>;
  readonly lineupChangesByEntryId: Readonly<Record<string, readonly SetlistEntryLineupChange[]>>;
  readonly onAddSongs?: () => void;
  readonly onOpen: (entryId: string) => void;
  readonly onRemove: (entryId: string) => void;
  readonly onOpenTransition: (leftSongId: string, rightSongId: string) => void;
}

// @FollowsBlueprint organism-presentational
export function SetlistEntriesList(props: SetlistEntriesListProps): JSX.Element {
  const { t } = useTranslation();
  const renderTransitionBefore = (fullIndex: number): JSX.Element | null => {
    if (props.inFilteredMode) return null;
    const view = props.transitionViews[fullIndex - 1];
    const leftEntry = props.entries[fullIndex - 1];
    const rightEntry = props.entries[fullIndex];
    if (view === undefined || leftEntry === undefined || rightEntry === undefined) return null;
    return (
      <TransitionStrip
        view={view}
        note={
          props.transitionNotesByPair[transitionPairKey(leftEntry.songId, rightEntry.songId)] ?? ''
        }
        onOpenNote={() => props.onOpenTransition(leftEntry.songId, rightEntry.songId)}
      />
    );
  };

  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {props.visibleEntries.map((entry, visibleIndex) => {
        const song = props.songsById[entry.songId];
        const lineupRaw = lineupOf(entry, props.songsById);
        warnIfOrphanMemberIds(lineupRaw, props.knownMemberIds, entry.songId);
        const fullIndex = props.entries.indexOf(entry);
        const lineupColumn = buildLineupColumn({
          instruments: props.slotInstruments,
          lineup: compactLineup(lineupRaw),
          members: props.lineupMembers,
        });
        return (
          <SetlistEntryRow
            key={entry.id}
            position={props.inFilteredMode ? visibleIndex + 1 : fullIndex + 1}
            memberPart={props.memberPartByEntryId[entry.id] ?? NO_MEMBER_PART}
            isMemberView={props.inFilteredMode}
            entryId={entry.id}
            title={song?.title ?? entry.songId.slice(0, SONG_ID_FALLBACK_LENGTH)}
            deezerAlbumId={song?.deezerAlbumId ?? null}
            artist={song?.artist ?? ''}
            keyLabel={entry.keyOverride ?? tonalityLabelFor(song)}
            capo={entry.capo}
            notes={entry.notes}
            lineupColumn={lineupColumn}
            lineupChanges={props.lineupChangesByEntryId[entry.id] ?? NO_CHANGE}
            transitionBefore={renderTransitionBefore(fullIndex)}
            onOpen={() => props.onOpen(entry.id)}
            onRemove={props.onRemove}
          />
        );
      })}
      {props.onAddSongs === undefined || props.inFilteredMode ? null : (
        <li>
          <ListRow
            onClick={props.onAddSongs}
            isChevronShown={false}
            className="min-h-14 gap-2 border-b border-dashed border-rule py-2 text-ink-soft"
          >
            <span className="w-5 shrink-0 text-right font-mono text-label text-ink-faint">
              {String(props.entries.length + 1).padStart(POSITION_DIGITS, '0')}
            </span>
            <Icon name="plus" className="text-accent" />
            <span className="text-body">{t('setlist.addSongs')}</span>
          </ListRow>
        </li>
      )}
    </ul>
  );
}
