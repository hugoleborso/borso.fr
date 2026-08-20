/**
 * One row of the setlist editor: the position, a drag handle, the song and
 * who plays what on it, the energy bar, and the row actions.
 *
 * A closed card is two lines: the position, the drag handle, the title and one
 * `⋯` button, then the energy bar under them. Everything else — the key, the
 * capo, the notes, the lineup and the removal — lives behind that button,
 * because a row of thumb-sized buttons is a line of its own on a phone and a
 * setlist is read a screen at a time. `⋯` sits beside the title rather than
 * under the bar for the same reason: the line it would occupy costs more than
 * the width it takes from the title.
 *
 * Everything sits in the same order in the markup and in both layouts, so tab
 * order is reading order.
 *
 * The title is the one thing allowed to wrap — on stage a half-read title is
 * worth nothing. The line under it holds the artist, the key, the mastery and
 * the band on one line whatever it carries: everything but the artist refuses
 * to shrink, and the artist truncates into whatever is left, keeping its full
 * text in a `title`. A wrapping meta line spent a whole line of the card on
 * four avatars.
 *
 * Each row owns a small `useForm` instance rather than reading per-row state
 * from a store above it. The form is never submitted: it exists for field
 * state and Zod validation, and every change calls `onUpdate` beside
 * `field.handleChange`, so the live-edit semantics (per-keystroke mutation)
 * are preserved without an effect.
 *
 * The list item itself is the dnd-kit sortable node, so the whole row
 * (the transition strip that precedes it, plus the card) is what reorders.
 * While the row is the one being dragged it dims into a placeholder so the
 * operator can read the gap opening between the other cards.
 *
 * Removing a row asks first, and it is drawn in the danger palette: the write
 * has no undo, and both it and Lineup are a tap away inside the same panel.
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
import type { SetlistEntryPatch } from '../../lib/queries/setlists.queries';

const POSITION_DIGITS = 2;
const ICON_BUTTON_CLASS =
  'w-11 h-11 sm:w-9 sm:h-9 shrink-0 inline-flex items-center justify-center rounded-md text-ink-400 hover:text-ink-900 hover:bg-bg-sunk cursor-pointer bg-transparent border-0';
const MENU_ITEM_CLASS =
  'min-h-11 flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-line ' +
  'bg-bg-elev px-3 text-sm text-ink-700 cursor-pointer hover:border-line-strong';

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
  readonly lineup: Readonly<Record<string, readonly string[]>>;
  readonly resolvedLineupForEdit: LineupRecord;
  readonly songDefaultLineup: LineupRecord;
  readonly hasOverride: boolean;
  readonly members: readonly LineupMember[];
  readonly instruments: readonly LineupEditorInstrument[];
  readonly prominentMemberInstrument: ProminentMemberInstrument | null;
  readonly transitionBefore: ReactNode;
  readonly onUpdate: (entryId: string, patch: SetlistEntryPatch) => void;
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
            {String(props.position).padStart(POSITION_DIGITS, '0')}
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
            <div className="flex items-center gap-1.5 text-xs text-ink-500 mt-0.5 min-w-0">
              <span className="truncate" title={props.artist}>
                {props.artist}
              </span>
              {props.tonalityLabel === null ? null : (
                <>
                  <span className="text-ink-300 shrink-0">·</span>
                  <span className="font-mono text-xs uppercase tracking-wider shrink-0">
                    {props.tonalityLabel}
                  </span>
                </>
              )}
              {props.meanMastery === null ? null : (
                <>
                  <span className="text-ink-300 shrink-0">·</span>
                  <span
                    className="font-mono inline-flex items-center gap-1 text-xs shrink-0"
                    style={{ color: selectMasteryColor(props.meanMastery) }}
                  >
                    <Icon name="star" size={11} />
                    {props.meanMastery.toFixed(1)}
                  </span>
                </>
              )}
              <span className="text-ink-300 shrink-0">·</span>
              <MemberLineup
                lineup={props.lineup}
                members={props.members}
                instruments={props.instruments}
              />
            </div>
          </div>
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
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <form.Field name="energy">
            {(field) => {
              const isStored = isEnergyStored({
                isEdited: field.state.meta.isDirty,
                entryEnergy: props.energy,
                songEnergy: props.baseEnergy,
              });
              const appearance = selectEnergyAppearance(isStored);
              const changeEnergy = (next: number): void => {
                field.handleChange(next);
                publishEnergy(next);
              };
              return (
                <>
                  <span className="text-xs font-mono uppercase tracking-wider text-ink-400 shrink-0">
                    {t('setlist.energy')}
                  </span>
                  <EnergyBar
                    value={field.state.value}
                    minimum={ENERGY_MIN}
                    maximum={ENERGY_MAX}
                    label={t('setlist.energy')}
                    valueText={
                      isStored ? undefined : t('setlist.energyUnset', { value: field.state.value })
                    }
                    filledClassName={appearance.filledClassName}
                    emptyClassName={appearance.emptyClassName}
                    className="w-full sm:flex-1 sm:max-w-[320px]"
                    onChange={changeEnergy}
                  />
                </>
              );
            }}
          </form.Field>
        </div>
        {moreOpen ? (
          <div className="flex flex-col gap-2 border-t border-line pt-2">
            <SetlistEntryDetailsFields
              form={form}
              onPatch={(patch) => props.onUpdate(props.entryId, patch)}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLineupEditorOpen(true)}
                className={MENU_ITEM_CLASS}
              >
                <Icon name="members" size={15} />
                {t('lineup.edit')}
              </button>
              <button
                type="button"
                onClick={() => setIsRemovalPending(true)}
                className={composeClassName(MENU_ITEM_CLASS, 'text-danger hover:border-danger')}
              >
                <Icon name="trash" size={14} />
                {t('setlist.removeEntry')}
              </button>
            </div>
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
