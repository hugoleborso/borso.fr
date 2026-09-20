/** @Feature setlists */

import { AlbumCover } from '../atoms/AlbumCover';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { JSX, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import {
  LineupEditor,
  type LineupEditorInstrument,
  type LineupRecord,
} from '../molecules/LineupEditor';
import { toLineupPayload } from '../molecules/lineup-editor.core';
import { useSongLongPress } from '../../lib/song-long-press.hook';
import { ConfirmDialog } from '../molecules/ConfirmDialog';
import { SetlistEntryActions } from '../molecules/SetlistEntryActions';
import {
  type SongDefaults,
  SongDefaultsDialog,
  type SongDefaultsPatch,
} from '../molecules/SongDefaultsDialog';
import { SetlistEntryDetailsFields } from '../molecules/SetlistEntryDetailsFields';
import {
  type SetlistEntryFormValues,
  useSetlistEntryForm,
} from '../molecules/setlist-entry-form.hook';
import { SetlistEntryEnergyField } from '../molecules/SetlistEntryEnergyField';
import { selectMasteryColor } from './mastery-color.core';
import {
  isOverridingSongLineup,
  selectSetlistEntryTone,
  selectSetlistEntryToneAppearance,
} from './setlist-entry-tone.core';
import type { LineupMember } from '../molecules/MemberLineup';
import { LineupSlots } from '../molecules/LineupSlots';
import {
  type LineupColumnView,
  naturalColumnWidth,
  OVERFLOW_COUNTER_WIDTH_PX,
} from '../molecules/lineup-slots.core';
import type { SetlistEntryPatch } from '../../lib/queries/setlist-entries.queries';

const POSITION_DIGITS = 2;
const ICON_BUTTON_CLASS =
  'w-9 h-11 sm:h-10 shrink-0 inline-flex items-center justify-center rounded-md text-ink-400 hover:text-ink-900 hover:bg-bg-sunk cursor-pointer bg-transparent border-0';
const LINEUP_BUTTON_CLASS =
  'hidden sm:inline-flex h-11 sm:h-10 grow-0 shrink-[999] items-center overflow-hidden rounded-md cursor-pointer bg-transparent border-0 hover:bg-bg-sunk';
const TITLE_COLUMN_CLASS = 'h-11 sm:h-10 min-w-0 flex-auto select-none overflow-hidden';
const TITLE_CLASS = 'block truncate font-display text-[17px] italic leading-[22px] text-ink-900';
const NARROW_LINEUP_BUTTON_CLASS =
  'flex w-full min-w-0 sm:hidden items-center -ml-0.5 px-0.5 overflow-hidden cursor-pointer bg-transparent border-0';

export interface SetlistEntryRowProps {
  readonly position: number;
  readonly entryId: string;
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
  readonly transitionBefore: ReactNode;
  readonly onUpdate: (entryId: string, patch: SetlistEntryPatch) => void;
  readonly onUpdateSongDefaults: (patch: SongDefaultsPatch) => void;
  readonly onRemove: (entryId: string) => void;
}

// @FollowsBlueprint organism-form
export function SetlistEntryRow(props: SetlistEntryRowProps): JSX.Element {
  const { t } = useTranslation();
  const longPress = useSongLongPress({
    title: props.title,
    artist: props.artist,
    deezerTrackId: props.deezerTrackId,
    spotifyTrackId: props.spotifyTrackId,
  });
  const [moreOpen, setMoreOpen] = useState<boolean>(false);
  const [lineupEditorOpen, setLineupEditorOpen] = useState<boolean>(false);
  const [defaultLineupEditorOpen, setDefaultLineupEditorOpen] = useState<boolean>(false);
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
  const saveLineupOverride = (lineup: LineupRecord | null, wasReset: boolean): void => {
    props.onUpdate(props.entryId, {
      lineupOverride: wasReset || lineup === null ? null : toLineupPayload(lineup),
    });
  };
  const saveDefaultLineup = (lineup: LineupRecord | null): void => {
    props.onUpdateSongDefaults({ defaultLineup: toLineupPayload(lineup ?? {}) });
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
          'flex flex-col rounded-md border py-1 pl-0.5 pr-0 transition-colors hover:border-line-strong',
          toneAppearance.surfaceClassName,
          toneAppearance.borderClassName,
        )}
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="flex h-11 w-5 shrink-0 cursor-grab touch-none items-center justify-center border-0 bg-transparent text-ink-300 hover:text-ink-500 active:cursor-grabbing sm:h-10"
            aria-label={t('setlist.dragHandle')}
            {...attributes}
            {...listeners}
          >
            <Icon name="drag" size={14} />
          </button>
          <AlbumCover title={props.title} deezerAlbumId={props.deezerAlbumId} size="sm" />
          <span className="w-4 shrink-0 text-right font-mono text-[10px] text-ink-300">
            {String(props.position).padStart(POSITION_DIGITS, '0')}
          </span>
          <div className={TITLE_COLUMN_CLASS} {...longPress}>
            <span className={TITLE_CLASS}>{props.title}</span>
            <span className="hidden min-w-0 items-center gap-1.5 text-[11px] text-ink-500 sm:flex">
              <span className="truncate">{props.artist}</span>
              {props.tonalityLabel === null ? null : (
                <>
                  <span className="shrink-0 text-ink-300">·</span>
                  <span className="shrink-0 font-mono uppercase tracking-wider">
                    {props.tonalityLabel}
                  </span>
                </>
              )}
              {props.meanMastery === null ? null : (
                <>
                  <span className="shrink-0 text-ink-300">·</span>
                  <span
                    className="inline-flex shrink-0 items-center gap-0.5 font-mono"
                    style={{ color: selectMasteryColor(props.meanMastery) }}
                  >
                    <Icon name="star" size={10} />
                    {props.meanMastery.toFixed(1)}
                  </span>
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => setLineupEditorOpen(true)}
              aria-label={t('lineup.editOverride')}
              className={NARROW_LINEUP_BUTTON_CLASS}
            >
              <LineupSlots column={props.lineupColumn} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setLineupEditorOpen(true)}
            aria-label={t('lineup.editOverride')}
            className={LINEUP_BUTTON_CLASS}
            style={{
              flexBasis: naturalColumnWidth(props.lineupColumn),
              minWidth: OVERFLOW_COUNTER_WIDTH_PX,
            }}
          >
            <LineupSlots column={props.lineupColumn} />
          </button>
          <SetlistEntryEnergyField
            entryEnergy={props.energy}
            songEnergy={props.baseEnergy}
            onPublish={publishEnergy}
          />
          <button
            type="button"
            onClick={() => setMoreOpen((current) => !current)}
            aria-label={t('common.actions')}
            aria-expanded={moreOpen}
            className={ICON_BUTTON_CLASS}
          >
            <Icon name="more" size={15} />
          </button>
        </div>
        {moreOpen ? (
          <div className="flex flex-col gap-2 border-t border-line px-1.5 pt-2">
            <SetlistEntryDetailsFields
              form={form}
              onPatch={(patch) => props.onUpdate(props.entryId, patch)}
            />
            <SetlistEntryActions
              onEditLineupOverride={() => setLineupEditorOpen(true)}
              onEditDefaultLineup={() => setDefaultLineupEditorOpen(true)}
              onEditSongDefaults={() => setSongDefaultsOpen(true)}
              onRemove={() => setIsRemovalPending(true)}
            />
          </div>
        ) : null}
      </div>
      <LineupEditor
        open={lineupEditorOpen}
        surface="setlist-entry"
        members={lineupEditorMembers}
        instruments={props.instruments}
        currentLineup={props.resolvedLineupForEdit}
        defaultLineup={props.songDefaultLineup}
        overridesSongDefault={isOverriding}
        onSave={saveLineupOverride}
        onClose={() => setLineupEditorOpen(false)}
      />
      <LineupEditor
        open={defaultLineupEditorOpen}
        surface="song"
        members={lineupEditorMembers}
        instruments={props.instruments}
        currentLineup={props.songDefaultLineup}
        onSave={saveDefaultLineup}
        onClose={() => setDefaultLineupEditorOpen(false)}
      />
      <SongDefaultsDialog
        open={songDefaultsOpen}
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
