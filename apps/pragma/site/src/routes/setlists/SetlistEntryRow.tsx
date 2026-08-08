/**
 * One row of the setlist editor. Mirrors the prototype's `.sl-row`
 * (design-bundle/styles.css lines 312-336): a five-cell grid with
 *  - position number (mono),
 *  - drag handle (icon button carrying dnd-kit's sortable listeners —
 *    grabbing it drags the whole card, which translates under the
 *    pointer while its neighbours shift to open the drop gap),
 *  - song title (font-display italic) + submeta (artist · tonality ·
 *    mastery) + member-chip lineup,
 *  - energy slider (1-10) + numeric tag,
 *  - actions menu (Lineup button + delete + a "more" toggle that
 *    reveals an inline editor for keyOverride / capo / notes).
 *
 * Each row owns a small `useForm` instance — the parent
 * (`SetlistEditor`) doesn't centralise per-row state. Field changes
 * propagate to the parent via `onUpdate` after `field.handleChange`,
 * so the live-edit semantics (per-keystroke mutation) are preserved
 * without an effect.
 *
 * The list item itself is the dnd-kit sortable node, so the whole row
 * (optional transition warning + card) is what reorders. While the row
 * is the one being dragged it dims into a placeholder so the operator
 * can read the gap opening between the other cards.
 *
 * The `Lineup` button opens the `<LineupEditor surface='setlist-entry'>`
 * modal; saving the modal calls `onUpdate(entryId, { lineupOverride })`.
 * When the entry carries a non-null override, a small `lineup.override`
 * badge sits above the title. In single-member filter mode, the parent
 * passes a `prominentMemberInstrument` chip that hoists the filtered
 * member's instrument above the title.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { cn } from '../../components/atoms/cn.utils';
import { Icon } from '../../components/atoms/Icon';
import {
  LineupEditor,
  type LineupEditorInstrument,
  type LineupRecord,
} from '../../components/molecules/LineupEditor';
import { MemberChip } from '../../components/molecules/MemberChip';
import { selectMasteryColor } from './mastery-color.core';
import { type LineupMember, MemberLineup } from '../../components/molecules/MemberLineup';

const ENERGY_MIN = 1;
const ENERGY_MAX = 10;
const ENERGY_DEFAULT = 5;
const CAPO_MIN = 0;
const CAPO_MAX = 11;
const KEY_OVERRIDE_MAX = 16;
const NOTES_MAX = 1_024;

const setlistEntryFormSchema = z.object({
  keyOverride: z.string().max(KEY_OVERRIDE_MAX),
  capo: z.string().regex(/^(\d+)?$/u),
  notes: z.string().max(NOTES_MAX),
  energy: z.number().int().min(ENERGY_MIN).max(ENERGY_MAX),
});

type SetlistEntryFormValues = z.infer<typeof setlistEntryFormSchema>;

export interface ProminentMemberInstrument {
  readonly memberName: string;
  readonly memberColor: string;
  readonly instrumentName: string;
}

export interface SetlistEntryRowProps {
  readonly position: number;
  readonly entryId: string;
  readonly title: string;
  readonly artist: string;
  readonly tonalityLabel: string | null;
  readonly meanMastery: number | null;
  readonly keyOverride: string | null;
  readonly capo: number | null;
  readonly energy: number | null;
  readonly baseEnergy: number | null;
  readonly notes: string;
  readonly currentSongId: string;
  readonly lineup: Readonly<Record<string, string>>;
  readonly resolvedLineupForEdit: LineupRecord;
  readonly songDefaultLineup: LineupRecord;
  readonly hasOverride: boolean;
  readonly members: readonly LineupMember[];
  readonly instruments: readonly LineupEditorInstrument[];
  readonly prominentMemberInstrument: ProminentMemberInstrument | null;
  readonly showTransitionWarningBefore: boolean;
  readonly onUpdate: (entryId: string, patch: Record<string, unknown>) => void;
  readonly onRemove: (entryId: string) => void;
  readonly onOpenTransitionBefore: () => void;
}

const FIELD_CLASS =
  'w-full bg-bg-elev border border-line rounded-md px-2 py-1 text-[13px] font-mono text-ink-900 outline-none focus:border-ink-700';
const LABEL_CLASS =
  'flex flex-col gap-1 text-[10.5px] tracking-wider uppercase text-ink-400 font-medium';

export function SetlistEntryRow(props: SetlistEntryRowProps): JSX.Element {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState<boolean>(false);
  const [lineupEditorOpen, setLineupEditorOpen] = useState<boolean>(false);
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
    energy: props.energy ?? props.baseEnergy ?? ENERGY_DEFAULT,
  };
  const form = useForm({
    defaultValues,
    validators: { onChange: setlistEntryFormSchema },
    onSubmit: () => {},
  });
  const handleSaveLineup = (lineup: LineupRecord | null, wasReset: boolean): void => {
    props.onUpdate(props.entryId, { lineupOverride: wasReset ? null : lineup });
  };
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex flex-col gap-1', isDragging && 'opacity-40')}
    >
      {props.showTransitionWarningBefore ? (
        <button
          type="button"
          className="lg:hidden inline-flex items-center gap-1.5 text-[11px] font-medium text-warn bg-warn-soft self-start px-2 py-1 rounded-md cursor-pointer border-0"
          aria-label={t('setlist.openTransitionComment')}
          onClick={props.onOpenTransitionBefore}
        >
          <Icon name="warn" size={12} />
          {t('setlist.transitionWarning')}
        </button>
      ) : null}
      <div className="grid grid-cols-[32px_auto_1fr_auto_auto] items-center gap-3 bg-bg-elev border border-line rounded-md px-3 py-3 transition-colors hover:border-line-strong">
        <span className="font-mono text-[11px] text-ink-400 text-right">
          {String(props.position).padStart(2, '0')}
        </span>
        <button
          type="button"
          className="flex items-center justify-center w-6 h-6 text-ink-300 cursor-grab bg-transparent border-0 hover:text-ink-500 active:cursor-grabbing touch-none"
          aria-label={t('setlist.dragHandle')}
          {...attributes}
          {...listeners}
        >
          <Icon name="drag" size={16} />
        </button>
        <div className="min-w-0">
          {props.prominentMemberInstrument === null ? null : (
            <div className="flex items-center gap-2 mb-1">
              <MemberChip
                memberName={props.prominentMemberInstrument.memberName}
                memberColor={props.prominentMemberInstrument.memberColor}
                size="sm"
              />
              <span className="text-xs font-mono uppercase tracking-wider text-ink-700 bg-bg-sunk px-2 py-0.5 rounded">
                {props.prominentMemberInstrument.instrumentName}
              </span>
            </div>
          )}
          {props.hasOverride ? (
            <div className="mb-1">
              <span className="inline-block whitespace-nowrap text-[10px] uppercase tracking-wider text-accent bg-accent-soft px-1.5 py-0.5 rounded font-medium">
                {t('lineup.override')}
              </span>
            </div>
          ) : null}
          <div className="font-display italic text-[20px] leading-tight text-ink-900 truncate">
            {props.title}
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-ink-500 mt-0.5 flex-wrap">
            <span>{props.artist}</span>
            {props.tonalityLabel === null ? null : (
              <>
                <span className="text-ink-300">·</span>
                <span className="font-mono text-[10.5px] uppercase tracking-wider">
                  {props.tonalityLabel}
                </span>
              </>
            )}
            {props.meanMastery === null ? null : (
              <>
                <span className="text-ink-300">·</span>
                <span
                  className="font-mono inline-flex items-center gap-1 text-[10.5px]"
                  style={{ color: selectMasteryColor(props.meanMastery) }}
                >
                  <Icon name="star" size={11} />
                  {props.meanMastery.toFixed(1)}
                </span>
              </>
            )}
            <span className="text-ink-300">·</span>
            <MemberLineup
              lineup={props.lineup}
              members={props.members}
              instruments={props.instruments}
            />
          </div>
          {moreOpen ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
              <form.Field name="keyOverride">
                {(field) => (
                  <label className={LABEL_CLASS}>
                    {t('setlist.keyOverride')}
                    <input
                      type="text"
                      value={field.state.value}
                      onChange={(event) => {
                        const next = event.target.value;
                        field.handleChange(next);
                        props.onUpdate(props.entryId, {
                          keyOverride: next.length === 0 ? null : next,
                        });
                      }}
                      onBlur={field.handleBlur}
                      maxLength={KEY_OVERRIDE_MAX}
                      className={FIELD_CLASS}
                    />
                  </label>
                )}
              </form.Field>
              <form.Field name="capo">
                {(field) => (
                  <label className={LABEL_CLASS}>
                    {t('setlist.capo')}
                    <input
                      type="number"
                      min={CAPO_MIN}
                      max={CAPO_MAX}
                      value={field.state.value}
                      onChange={(event) => {
                        const next = event.target.value;
                        field.handleChange(next);
                        props.onUpdate(props.entryId, {
                          capo: next === '' ? null : Number(next),
                        });
                      }}
                      onBlur={field.handleBlur}
                      className={FIELD_CLASS}
                    />
                  </label>
                )}
              </form.Field>
              <form.Field name="notes">
                {(field) => (
                  <label className={LABEL_CLASS}>
                    {t('setlist.notes')}
                    <input
                      type="text"
                      value={field.state.value}
                      onChange={(event) => {
                        const next = event.target.value;
                        field.handleChange(next);
                        props.onUpdate(props.entryId, { notes: next });
                      }}
                      onBlur={field.handleBlur}
                      maxLength={NOTES_MAX}
                      className={FIELD_CLASS}
                    />
                  </label>
                )}
              </form.Field>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <form.Field name="energy">
            {(field) => (
              <>
                <span className="font-mono text-[11px] uppercase tracking-wider text-ink-500 min-w-[22px] text-center">
                  {field.state.meta.isDirty || props.energy !== null || props.baseEnergy !== null
                    ? field.state.value
                    : '—'}
                </span>
                <input
                  type="range"
                  min={ENERGY_MIN}
                  max={ENERGY_MAX}
                  value={field.state.value}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    field.handleChange(next);
                    props.onUpdate(props.entryId, { energy: next });
                  }}
                  onBlur={field.handleBlur}
                  aria-label={t('setlist.energy')}
                  className="w-22 accent-accent"
                  style={{ width: 88 }}
                />
              </>
            )}
          </form.Field>
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setLineupEditorOpen(true)}
            aria-label={t('lineup.edit')}
            className="px-2 h-7 inline-flex items-center justify-center text-[11px] text-ink-500 hover:text-ink-900 cursor-pointer bg-transparent border border-line rounded-md"
          >
            {t('lineup.edit')}
          </button>
          <button
            type="button"
            onClick={() => setMoreOpen((current) => !current)}
            aria-label={t('common.edit')}
            aria-expanded={moreOpen}
            className="w-7 h-7 inline-flex items-center justify-center text-ink-400 hover:text-ink-900 cursor-pointer bg-transparent border-0"
          >
            <Icon name="more" size={14} />
          </button>
          <button
            type="button"
            onClick={() => props.onRemove(props.entryId)}
            aria-label={t('setlist.removeEntry')}
            className="w-7 h-7 inline-flex items-center justify-center text-ink-400 hover:text-danger cursor-pointer bg-transparent border-0"
          >
            ×
          </button>
        </div>
      </div>
      <LineupEditor
        open={lineupEditorOpen}
        surface="setlist-entry"
        members={lineupEditorMembers}
        instruments={props.instruments}
        currentLineup={props.resolvedLineupForEdit}
        defaultLineup={props.songDefaultLineup}
        onSave={handleSaveLineup}
        onClose={() => setLineupEditorOpen(false)}
      />
    </li>
  );
}

export interface SetlistEntryDragPreviewProps {
  readonly position: number;
  readonly title: string;
  readonly artist: string;
}

/**
 * The solid card that rides the pointer inside dnd-kit's `DragOverlay`
 * while a row is being dragged. The in-list row dims to a ghost
 * placeholder at the live insertion slot; this is the piece the
 * operator actually carries, so it stays fully opaque and lifted.
 */
export function SetlistEntryDragPreview(props: SetlistEntryDragPreviewProps): JSX.Element {
  return (
    <div className="grid grid-cols-[32px_auto_1fr] items-center gap-3 bg-bg-elev border border-line-strong rounded-md px-3 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.28)] cursor-grabbing">
      <span className="font-mono text-[11px] text-ink-400 text-right">
        {String(props.position).padStart(2, '0')}
      </span>
      <span className="flex items-center justify-center w-6 h-6 text-ink-500">
        <Icon name="drag" size={16} />
      </span>
      <div className="min-w-0">
        <div className="font-display italic text-[20px] leading-tight text-ink-900 truncate">
          {props.title}
        </div>
        <div className="text-[11.5px] text-ink-500 mt-0.5 truncate">{props.artist}</div>
      </div>
    </div>
  );
}
