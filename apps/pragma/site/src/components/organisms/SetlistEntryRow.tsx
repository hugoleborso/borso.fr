/**
 * One row of the setlist editor: the position, a drag handle, the song and
 * who plays what on it, the energy slider, and the row actions.
 *
 * The layout stacks under `sm` and spreads out above it, so a phone gets one
 * readable column and thumb-sized controls rather than a five-cell grid
 * squeezed into 375 px. The energy control and the key / capo / notes panel sit
 * below the title row rather than inside it, so they span the card instead of
 * the 189 px the position, the drag handle and the action stack leave. The
 * title wraps into that column rather than being cut off at one line: the
 * action stack is 132 px tall beside it, so a second line costs no height, and
 * on stage a half-read title is worth nothing.
 *
 * Each row owns a small `useForm` instance — the parent
 * (`SetlistEditor`) doesn't centralise per-row state. The form is never
 * submitted: it exists for field state and Zod validation, and every change
 * reaches the parent through `onUpdate` from inside `field.handleChange`, so
 * the live-edit semantics (per-keystroke mutation) are preserved without an
 * effect. There is no `onSubmit` and no submit button anywhere in the row.
 *
 * The list item itself is the dnd-kit sortable node, so the whole row
 * (the transition strip that precedes it, plus the card) is what reorders.
 * While the row is the one being dragged it dims into a placeholder so the
 * operator can read the gap opening between the other cards.
 *
 * Removing a row asks first, and a rule separates it from Lineup and Edit: the
 * write has no undo, and a destructive target one pixel row away from an
 * ordinary one is a slip waiting to happen.
 *
 * The `Lineup` button opens the `<LineupEditor surface='setlist-entry'>`
 * modal; saving the modal calls `onUpdate(entryId, { lineupOverride })`.
 * When the entry carries a non-null override, a small `lineup.override`
 * badge sits above the title. In single-member filter mode, the parent
 * passes a `prominentMemberInstrument` chip that hoists what the filtered
 * member plays here above the title.
 */

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
import { MemberChip } from '../molecules/MemberChip';
import { ConfirmDialog } from '../molecules/ConfirmDialog';
import { SetlistEntryDetailsFields } from '../molecules/SetlistEntryDetailsFields';
import {
  ENERGY_MAX,
  ENERGY_MIN,
  type SetlistEntryFormValues,
  useSetlistEntryForm,
} from '../molecules/setlist-entry-form';
import { selectMasteryColor } from './mastery-color.core';
import {
  ENERGY_DEFAULT,
  isEnergyStored,
  selectEnergyAppearance,
} from './setlist-entry-energy.core';
import { type LineupMember, MemberLineup } from '../molecules/MemberLineup';

const ENERGY_STEP = 1;
const ICON_BUTTON_CLASS =
  'w-11 h-11 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-md text-ink-400 hover:text-ink-900 hover:bg-bg-sunk cursor-pointer bg-transparent border-0';

/**
 * Nine intervals over the width a phone leaves this row is about twelve pixels
 * per energy point, which is a drag nobody lands on the first try. The pair of
 * steppers is the exact way to move one point; the slider stays for the long
 * jumps.
 */
const ENERGY_STEP_BUTTON_CLASS =
  'w-11 h-11 sm:w-9 sm:h-9 shrink-0 inline-flex items-center justify-center rounded-md border border-line ' +
  'text-ink-700 bg-bg-elev cursor-pointer hover:border-line-strong disabled:opacity-40 disabled:cursor-not-allowed';

export interface ProminentMemberInstrument {
  readonly memberName: string;
  readonly memberColor: string;
  readonly instrumentNames: readonly string[];
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
  readonly lineup: Readonly<Record<string, readonly string[]>>;
  readonly resolvedLineupForEdit: LineupRecord;
  readonly songDefaultLineup: LineupRecord;
  readonly hasOverride: boolean;
  readonly members: readonly LineupMember[];
  readonly instruments: readonly LineupEditorInstrument[];
  readonly prominentMemberInstrument: ProminentMemberInstrument | null;
  readonly transitionBefore: ReactNode;
  readonly onUpdate: (entryId: string, patch: Record<string, unknown>) => void;
  readonly onRemove: (entryId: string) => void;
}

// @FollowsBlueprint organism-form
export function SetlistEntryRow(props: SetlistEntryRowProps): JSX.Element {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState<boolean>(false);
  const [lineupEditorOpen, setLineupEditorOpen] = useState<boolean>(false);
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
    energy: props.energy ?? props.baseEnergy ?? ENERGY_DEFAULT,
  };
  const form = useSetlistEntryForm(defaultValues);
  const saveLineupOverride = (lineup: LineupRecord | null, wasReset: boolean): void => {
    props.onUpdate(props.entryId, {
      lineupOverride: wasReset || lineup === null ? null : toLineupPayload(lineup),
    });
  };
  const publishEnergy = (next: number): void => {
    props.onUpdate(props.entryId, { energy: next });
  };
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={composeClassName('flex flex-col gap-1.5', isDragging && 'opacity-40')}
    >
      {props.transitionBefore}
      <div className="flex flex-col gap-2 bg-bg-elev border border-line rounded-md px-2 sm:px-3 py-2.5 transition-colors hover:border-line-strong">
        <div className="flex items-start gap-2 sm:gap-3">
          <span className="font-mono text-xs text-ink-400 pt-3 w-6 text-right shrink-0">
            {String(props.position).padStart(2, '0')}
          </span>
          <button
            type="button"
            className="flex items-center justify-center w-11 h-11 sm:w-8 sm:h-9 shrink-0 text-ink-300 cursor-grab bg-transparent border-0 hover:text-ink-500 active:cursor-grabbing touch-none"
            aria-label={t('setlist.dragHandle')}
            {...attributes}
            {...listeners}
          >
            <Icon name="drag" size={16} />
          </button>
          <div className="min-w-0 flex-1">
            {props.prominentMemberInstrument === null ? null : (
              <div className="flex items-center gap-2 mb-1">
                <MemberChip
                  memberName={props.prominentMemberInstrument.memberName}
                  memberColor={props.prominentMemberInstrument.memberColor}
                  size="sm"
                />
                <span className="text-xs font-mono uppercase tracking-wider text-ink-700 bg-bg-sunk px-2 py-0.5 rounded">
                  {props.prominentMemberInstrument.instrumentNames.join(' + ')}
                </span>
              </div>
            )}
            {props.hasOverride ? (
              <div className="mb-1">
                <span className="inline-block whitespace-nowrap text-xs uppercase tracking-wider text-accent bg-accent-soft px-1.5 py-0.5 rounded font-medium">
                  {t('lineup.override')}
                </span>
              </div>
            ) : null}
            <div className="font-display italic text-[18px] sm:text-[20px] leading-tight text-ink-900 [overflow-wrap:anywhere]">
              {props.title}
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-500 mt-0.5 flex-wrap">
              <span>{props.artist}</span>
              {props.tonalityLabel === null ? null : (
                <>
                  <span className="text-ink-300">·</span>
                  <span className="font-mono text-xs uppercase tracking-wider">
                    {props.tonalityLabel}
                  </span>
                </>
              )}
              {props.meanMastery === null ? null : (
                <>
                  <span className="text-ink-300">·</span>
                  <span
                    className="font-mono inline-flex items-center gap-1 text-xs"
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
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 sm:self-start">
            <button
              type="button"
              onClick={() => setLineupEditorOpen(true)}
              aria-label={t('lineup.edit')}
              title={t('lineup.edit')}
              className={ICON_BUTTON_CLASS}
            >
              <Icon name="members" size={15} />
            </button>
            <button
              type="button"
              onClick={() => setMoreOpen((current) => !current)}
              aria-label={t('common.edit')}
              aria-expanded={moreOpen}
              className={ICON_BUTTON_CLASS}
            >
              <Icon name="more" size={15} />
            </button>
            <span className="w-6 h-px sm:w-px sm:h-6 bg-line shrink-0" />
            <button
              type="button"
              onClick={() => setIsRemovalPending(true)}
              aria-label={t('setlist.removeEntry')}
              className={composeClassName(ICON_BUTTON_CLASS, 'hover:text-danger')}
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        </div>
        <form.Field name="energy">
          {(field) => {
            const appearance = selectEnergyAppearance(
              isEnergyStored({
                isEdited: field.state.meta.isDirty,
                entryEnergy: props.energy,
                songEnergy: props.baseEnergy,
              }),
            );
            return (
              <div className="flex items-center gap-2 max-w-full sm:max-w-[340px]">
                <span className="text-xs font-mono uppercase tracking-wider text-ink-400 shrink-0">
                  {t('setlist.energy')}
                </span>
                <input
                  type="range"
                  min={ENERGY_MIN}
                  max={ENERGY_MAX}
                  value={field.state.value}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    field.handleChange(next);
                    publishEnergy(next);
                  }}
                  onBlur={field.handleBlur}
                  aria-label={t('setlist.energy')}
                  className={composeClassName('flex-1 min-w-0 h-11', appearance.sliderClassName)}
                />
                <button
                  type="button"
                  className={ENERGY_STEP_BUTTON_CLASS}
                  disabled={field.state.value <= ENERGY_MIN}
                  aria-label={t('setlist.energyDown')}
                  onClick={() => {
                    const next = field.state.value - ENERGY_STEP;
                    field.handleChange(next);
                    publishEnergy(next);
                  }}
                >
                  −
                </button>
                <span
                  className={composeClassName(
                    'font-mono text-xs min-w-[18px] shrink-0 text-center',
                    appearance.readoutClassName,
                  )}
                >
                  {field.state.value}
                </span>
                <button
                  type="button"
                  className={ENERGY_STEP_BUTTON_CLASS}
                  disabled={field.state.value >= ENERGY_MAX}
                  aria-label={t('setlist.energyUp')}
                  onClick={() => {
                    const next = field.state.value + ENERGY_STEP;
                    field.handleChange(next);
                    publishEnergy(next);
                  }}
                >
                  +
                </button>
              </div>
            );
          }}
        </form.Field>
        {moreOpen ? (
          <SetlistEntryDetailsFields
            form={form}
            onPatch={(patch) => props.onUpdate(props.entryId, patch)}
          />
        ) : null}
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
