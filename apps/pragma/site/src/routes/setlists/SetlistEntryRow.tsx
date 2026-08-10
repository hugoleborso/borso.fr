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
 * (`SetlistEditor`) doesn't centralise per-row state. The form is never
 * submitted: it exists for field state and Zod validation, and every change
 * reaches the parent through `onUpdate` from inside `field.handleChange`, so
 * the live-edit semantics (per-keystroke mutation) are preserved without an
 * effect. There is no `onSubmit` and no submit button anywhere in the row.
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
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { composeClassName } from '../../components/atoms/class-name.utils';
import { Icon } from '../../components/atoms/Icon';
import {
  LineupEditor,
  type LineupEditorInstrument,
  type LineupRecord,
} from '../../components/molecules/LineupEditor';
import { MemberChip } from '../../components/molecules/MemberChip';
import { SetlistEntryDetailsFields } from '../../components/molecules/SetlistEntryDetailsFields';
import {
  ENERGY_MAX,
  ENERGY_MIN,
  type SetlistEntryFormValues,
  useSetlistEntryForm,
} from '../../components/molecules/setlist-entry-form';
import { selectMasteryColor } from './mastery-color.core';
import { type LineupMember, MemberLineup } from '../../components/molecules/MemberLineup';

const ENERGY_DEFAULT = 5;

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

// @FollowsBlueprint organism-form
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
  const form = useSetlistEntryForm(defaultValues);
  const saveLineupOverride = (lineup: LineupRecord | null, wasReset: boolean): void => {
    props.onUpdate(props.entryId, { lineupOverride: wasReset ? null : lineup });
  };
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={composeClassName('flex flex-col gap-1', isDragging && 'opacity-40')}
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
            <SetlistEntryDetailsFields
              form={form}
              onPatch={(patch) => props.onUpdate(props.entryId, patch)}
            />
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
        onSave={saveLineupOverride}
        onClose={() => setLineupEditorOpen(false)}
      />
    </li>
  );
}
