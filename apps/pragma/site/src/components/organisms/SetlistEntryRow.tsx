/** @Feature setlists */

import { AlbumCover } from '../atoms/AlbumCover';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { JSX, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { composeClassName } from '../atoms/class-name.utils';
import { IconButton } from '../atoms/IconButton';
import { Icon } from '../atoms/Icon';
import {
  LineupEditor,
  type LineupEditorInstrument,
  type LineupRecord,
} from '../molecules/LineupEditor';
import { selectLineupSaveTarget, toLineupPayload } from '../molecules/lineup-editor.core';
import { ConfirmDialog } from '../molecules/ConfirmDialog';
import {
  type SongDefaults,
  SongDefaultsDialog,
  type SongDefaultsPatch,
} from '../molecules/SongDefaultsDialog';
import {
  type SetlistEntryFormValues,
  useSetlistEntryForm,
} from '../molecules/setlist-entry-form.hook';
import { useLatestTextSave } from '../molecules/latest-text-save.hook';
import { SetlistEntrySheet } from './SetlistEntrySheet';
import { selectMasteryTextClass } from './mastery-color.core';
import {
  isOverridingSongLineup,
  selectSetlistEntryTone,
  selectSetlistEntryToneAppearance,
} from './setlist-entry-tone.core';
import type { LineupMember } from '../molecules/MemberLineup';
import { LineupSlots } from '../molecules/LineupSlots';
import { ListRow } from '../molecules/ListRow';
import {
  type LineupColumnView,
  naturalColumnWidth,
  OVERFLOW_COUNTER_WIDTH_PX,
} from '../molecules/lineup-slots.core';
import type { SetlistEntryPatch } from '../../lib/queries/setlist-entries.queries';
import { MemberPartGlyphs, type MemberPartGlyph } from '../molecules/MemberPartGlyphs';

const POSITION_DIGITS = 2;
const OPEN_SHEET_BUTTON_CLASS = 'min-w-0 flex-1 gap-1.5 pr-1';
const DRAG_HANDLE_CLASS = 'shrink-0 cursor-grab touch-none text-ink-faint active:cursor-grabbing';
const WIDE_LINEUP_CLASS =
  'hidden sm:inline-flex h-11 sm:h-10 grow-0 shrink-[999] items-center overflow-hidden';
const TITLE_COLUMN_CLASS = 'block min-h-11 sm:min-h-10 min-w-0 flex-auto overflow-hidden';
const TITLE_CLASS = 'block truncate font-display text-title leading-[22px] text-ink';
const NARROW_LINEUP_CLASS =
  'flex w-full min-w-0 sm:hidden items-center -ml-0.5 px-0.5 overflow-hidden';

export interface SetlistEntryRowProps {
  readonly position: number;
  readonly entryId: string;
  readonly songId: string;
  readonly title: string;
  readonly deezerAlbumId: string | null;
  readonly deezerTrackId: string | null;
  readonly spotifyTrackId: string | null;
  readonly artist: string;
  readonly tonalityLabel: string | null;
  readonly meanMastery: number | null;
  readonly keyOverride: string | null;
  readonly capo: number | null;
  readonly energy: number | null;
  readonly baseEnergy: number | null;
  readonly notes: string;
  readonly lineupColumn: LineupColumnView;
  readonly resolvedLineupForEdit: LineupRecord;
  readonly songDefaultLineup: LineupRecord;
  readonly songDefaults: SongDefaults;
  readonly lineupOverride: LineupRecord | null;
  readonly members: readonly LineupMember[];
  readonly instruments: readonly LineupEditorInstrument[];
  readonly memberPart: readonly MemberPartGlyph[];
  readonly isMemberView: boolean;
  readonly transitionBefore: ReactNode;
  readonly onUpdate: (entryId: string, patch: SetlistEntryPatch) => void;
  readonly onSave: (entryId: string, patch: SetlistEntryPatch) => Promise<unknown>;
  readonly onUpdateSongDefaults: (patch: SongDefaultsPatch) => void;
  readonly onRemove: (entryId: string) => void;
}

// @FollowsBlueprint organism-form
export function SetlistEntryRow(props: SetlistEntryRowProps): JSX.Element {
  const { t } = useTranslation();
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [lineupEditorOpen, setLineupEditorOpen] = useState<boolean>(false);
  const [songDefaultsOpen, setSongDefaultsOpen] = useState<boolean>(false);
  const [isRemovalPending, setIsRemovalPending] = useState<boolean>(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.entryId,
  });
  const lineupEditorMembers = useMemo(
    () =>
      props.members.map((member) => ({ id: member.id, name: member.name, color: member.color })),
    [props.members],
  );
  const defaultValues: SetlistEntryFormValues = {
    keyOverride: props.keyOverride ?? '',
    capo: props.capo === null ? '' : String(props.capo),
    notes: props.notes,
  };
  const form = useSetlistEntryForm(defaultValues);
  const notesSave = useLatestTextSave({
    savedText: defaultValues.notes,
    save: (text) => props.onSave(props.entryId, { notes: text }),
  });
  const keySave = useLatestTextSave({
    savedText: defaultValues.keyOverride,
    save: (text) => props.onSave(props.entryId, { keyOverride: text.length === 0 ? null : text }),
  });
  const capoSave = useLatestTextSave({
    savedText: defaultValues.capo,
    save: (text) => props.onSave(props.entryId, { capo: text === '' ? null : Number(text) }),
  });
  const closeSheet = (): void => {
    notesSave.flush();
    keySave.flush();
    capoSave.flush();
    setIsSheetOpen(false);
  };
  const saveLineupAsSongDefault = (lineup: LineupRecord | null): void => {
    props.onUpdateSongDefaults({ defaultLineup: toLineupPayload(lineup) });
    if (props.lineupOverride !== null) props.onUpdate(props.entryId, { lineupOverride: null });
  };
  const saveLineupOverride = (lineup: LineupRecord | null, wasReset: boolean): void => {
    const saveTo = {
      'song-default': () => saveLineupAsSongDefault(lineup),
      'entry-override': () =>
        props.onUpdate(props.entryId, { lineupOverride: toLineupPayload(lineup) }),
      'entry-cleared': () => props.onUpdate(props.entryId, { lineupOverride: null }),
    } as const;
    saveTo[selectLineupSaveTarget(props.songDefaultLineup, lineup, wasReset)]();
  };
  const openFromSheet = (open: (isOpen: boolean) => void): void => {
    closeSheet();
    open(true);
  };
  const publishEnergy = (next: number): void => {
    props.onUpdate(props.entryId, { energy: next });
  };
  const isOverriding = isOverridingSongLineup(props.songDefaultLineup, props.lineupOverride);
  const tone = selectSetlistEntryTone(props.songDefaultLineup, props.lineupOverride);
  const toneAppearance = selectSetlistEntryToneAppearance(tone);
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={composeClassName('flex flex-col gap-1', isDragging && 'opacity-40')}
    >
      {props.transitionBefore}
      <div
        data-tone={tone}
        className={composeClassName(
          'flex flex-col rounded-md border py-1 pl-0.5 pr-0 transition-colors hover:border-rule-strong',
          toneAppearance.surfaceClassName,
          toneAppearance.borderClassName,
        )}
      >
        <div className="flex items-center gap-1.5">
          <IconButton
            icon="drag"
            label={t('setlist.dragHandle')}
            size="sm"
            className={DRAG_HANDLE_CLASS}
            {...attributes}
            {...listeners}
          />
          <ListRow
            onClick={() => setIsSheetOpen(true)}
            isChevronShown={false}
            className={OPEN_SHEET_BUTTON_CLASS}
          >
            <AlbumCover title={props.title} deezerAlbumId={props.deezerAlbumId} size="sm" />
            <span className="w-4 shrink-0 text-right font-mono text-label text-ink-faint">
              {String(props.position).padStart(POSITION_DIGITS, '0')}
            </span>
            <span className={TITLE_COLUMN_CLASS}>
              <span className={TITLE_CLASS}>{props.title}</span>
              <span className="hidden min-w-0 items-center gap-1.5 text-label text-ink-soft sm:flex">
                <span className="truncate">{props.artist}</span>
                {props.tonalityLabel === null ? null : (
                  <>
                    <span className="shrink-0 text-ink-faint">·</span>
                    <span className="shrink-0 font-mono uppercase tracking-wider">
                      {props.tonalityLabel}
                    </span>
                  </>
                )}
                {props.meanMastery === null ? null : (
                  <>
                    <span className="shrink-0 text-ink-faint">·</span>
                    <span
                      className={composeClassName(
                        'inline-flex shrink-0 items-center gap-0.5 font-mono',
                        selectMasteryTextClass(props.meanMastery),
                      )}
                    >
                      <Icon name="star" size="sm" />
                      {props.meanMastery.toFixed(1)}
                    </span>
                  </>
                )}
              </span>
              {props.isMemberView ? null : (
                <span className={NARROW_LINEUP_CLASS}>
                  <LineupSlots column={props.lineupColumn} />
                </span>
              )}
            </span>
            {props.isMemberView ? (
              <span className="flex shrink-0 items-center pr-2">
                <MemberPartGlyphs parts={props.memberPart} size="md" />
              </span>
            ) : (
              <span
                className={WIDE_LINEUP_CLASS}
                style={{
                  flexBasis: naturalColumnWidth(props.lineupColumn),
                  minWidth: OVERFLOW_COUNTER_WIDTH_PX,
                }}
              >
                <LineupSlots column={props.lineupColumn} />
              </span>
            )}
          </ListRow>
        </div>
      </div>
      {isSheetOpen ? (
        <SetlistEntrySheet
          subject={{
            title: props.title,
            artist: props.artist,
            deezerTrackId: props.deezerTrackId,
            spotifyTrackId: props.spotifyTrackId,
          }}
          deezerAlbumId={props.deezerAlbumId}
          memberPart={props.memberPart}
          lineupColumn={props.lineupColumn}
          energy={props.energy}
          baseEnergy={props.baseEnergy}
          form={form}
          onPublishEnergy={publishEnergy}
          onNotesType={notesSave.type}
          onKeyType={keySave.type}
          onCapoType={capoSave.type}
          onEditLineupOverride={() => openFromSheet(setLineupEditorOpen)}
          onEditSongDefaults={() => openFromSheet(setSongDefaultsOpen)}
          onRemove={() => openFromSheet(setIsRemovalPending)}
          onClose={closeSheet}
        />
      ) : null}
      <LineupEditor
        open={lineupEditorOpen}
        surface="setlist-entry"
        members={lineupEditorMembers}
        instruments={props.instruments}
        currentLineup={props.resolvedLineupForEdit}
        defaultLineup={props.songDefaultLineup}
        overridesSongDefault={isOverriding}
        onSave={saveLineupOverride}
        onSaveAsSongDefault={saveLineupAsSongDefault}
        onClose={() => setLineupEditorOpen(false)}
      />
      <SongDefaultsDialog
        open={songDefaultsOpen}
        songId={props.songId}
        songTitle={props.title}
        defaults={props.songDefaults}
        onSave={(defaults) => props.onUpdateSongDefaults(defaults)}
        onClose={() => setSongDefaultsOpen(false)}
      />
      {isRemovalPending ? (
        <ConfirmDialog
          question={t('setlist.removeConfirm', { title: props.title })}
          confirmLabel={t('setlist.removeEntry')}
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
