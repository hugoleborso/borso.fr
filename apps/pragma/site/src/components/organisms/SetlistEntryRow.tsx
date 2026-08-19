/**
 * One row of the setlist editor: the position, a drag handle, the song and
 * who plays what on it, the energy slider, and the row actions.
 *
 * The card is a header and a footer: the position, the drag handle and the
 * title on top, then one strip carrying the energy readout and the three row
 * actions, with the energy bar spanning the card under it. The actions are a
 * row in both layouts. Stacked into a column they were 157 px of buttons
 * beside a 61 px title, so two thirds of a phone's song card was the empty
 * space that column reserved; on a 375 px screen a card is now about 160 px
 * instead of 230 px, and nothing in it is blank.
 *
 * The title wraps rather than being cut off at one line — on stage a half-read
 * title is worth nothing — and it spans the card because nothing sits to its
 * right any more.
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
 * @Feature setlists
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { JSX, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { composeClassName } from '../atoms/class-name.utils';
import { EnergyBar } from '../atoms/EnergyBar';
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
} from '../molecules/setlist-entry-form.hook';
import { selectMasteryColor } from './mastery-color.core';
import {
  ENERGY_DEFAULT,
  isEnergyStored,
  selectEnergyAppearance,
} from './setlist-entry-energy.core';
import { type LineupMember, MemberLineup } from '../molecules/MemberLineup';

const ICON_BUTTON_CLASS =
  'w-11 h-11 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-md text-ink-400 hover:text-ink-900 hover:bg-bg-sunk cursor-pointer bg-transparent border-0';

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
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:flex-nowrap sm:gap-3">
          <form.Field name="energy">
            {(field) => {
              const appearance = selectEnergyAppearance(
                isEnergyStored({
                  isEdited: field.state.meta.isDirty,
                  entryEnergy: props.energy,
                  songEnergy: props.baseEnergy,
                }),
              );
              const changeEnergy = (next: number): void => {
                field.handleChange(next);
                publishEnergy(next);
              };
              return (
                <>
                  <span className="order-1 text-xs font-mono uppercase tracking-wider text-ink-400 shrink-0">
                    {t('setlist.energy')}
                  </span>
                  <span
                    className={composeClassName(
                      'order-2 sm:order-4 font-mono text-sm min-w-[18px] shrink-0 text-center',
                      appearance.readoutClassName,
                    )}
                  >
                    {field.state.value}
                  </span>
                  <EnergyBar
                    value={field.state.value}
                    minimum={ENERGY_MIN}
                    maximum={ENERGY_MAX}
                    label={t('setlist.energy')}
                    filledClassName={appearance.filledClassName}
                    emptyClassName={appearance.emptyClassName}
                    className="order-4 sm:order-3 w-full sm:w-auto sm:flex-1 sm:max-w-[320px]"
                    onChange={changeEnergy}
                  />
                </>
              );
            }}
          </form.Field>
          <div className="order-3 sm:order-5 ml-auto flex items-center gap-2 shrink-0">
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
            <span className="w-px h-6 bg-line shrink-0" />
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
