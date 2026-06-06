/**
 * One row of the setlist editor. Mirrors the prototype's `.sl-row`
 * (design-bundle/styles.css lines 312-336): a five-cell grid with
 *  - position number (mono),
 *  - drag handle (icon button, gives the row its draggable
 *    affordance — handled by the parent via `onDragStart`),
 *  - song title (font-display italic) + submeta (artist · tonality ·
 *    mastery) + member-chip lineup,
 *  - energy slider (1-10) + numeric tag,
 *  - actions menu (delete button + a "more" toggle that reveals an
 *    inline editor for keyOverride / capo / notes).
 *
 * Each row owns a small `useForm` instance — the parent
 * (`SetlistEditor`) doesn't centralise per-row state. Field changes
 * propagate to the parent via `onUpdate` after `field.handleChange`,
 * so the live-edit semantics (per-keystroke mutation) are preserved
 * without an effect.
 */

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
  readonly notes: string;
  readonly currentSongId: string;
  readonly lineup: Readonly<Record<string, string>>;
  readonly resolvedLineupForEdit: LineupRecord;
  readonly songDefaultLineup: LineupRecord;
  readonly hasOverride: boolean;
  readonly members: readonly LineupMember[];
  readonly instruments: readonly LineupEditorInstrument[];
  readonly prominentMemberInstrument: ProminentMemberInstrument | null;
  readonly onUpdate: (entryId: string, patch: Record<string, unknown>) => void;
  readonly onRemove: (entryId: string) => void;
  readonly onDragStart: (entryId: string) => void;
  readonly onDropOn: (targetEntryId: string) => void;
}

const FIELD_CLASS =
  'w-full bg-bg-elev border border-line rounded-md px-2 py-1 text-[13px] font-mono text-ink-900 outline-none focus:border-ink-700';
const LABEL_CLASS =
  'flex flex-col gap-1 text-[10.5px] tracking-wider uppercase text-ink-400 font-medium';

function masteryColor(score: number | null): string {
  if (score === null) return 'var(--color-ink-400)';
  if (score >= 7) return 'var(--color-good)';
  if (score >= 5) return 'var(--color-warn)';
  return 'var(--color-danger)';
}

export function SetlistEntryRow(props: SetlistEntryRowProps): JSX.Element {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState<boolean>(false);
  const [lineupEditorOpen, setLineupEditorOpen] = useState<boolean>(false);
  const lineupEditorMembers = useMemo(
    () =>
      props.members.map((member) => ({ id: member.id, name: member.name, color: member.color })),
    [props.members],
  );
  const defaultValues: SetlistEntryFormValues = {
    keyOverride: props.keyOverride ?? '',
    capo: props.capo === null ? '' : String(props.capo),
    notes: props.notes,
    energy: props.energy ?? ENERGY_DEFAULT,
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
      className={cn(
        'grid grid-cols-[32px_auto_1fr_auto_auto] items-center gap-3 bg-bg-elev border border-line rounded-md px-3 py-3 transition-colors hover:border-line-strong',
      )}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        props.onDropOn(props.entryId);
      }}
    >
      <span className="font-mono text-[11px] text-ink-400 text-right">
        {String(props.position).padStart(2, '0')}
      </span>
      <button
        type="button"
        className="flex items-center justify-center w-6 h-6 text-ink-300 cursor-grab bg-transparent border-0 hover:text-ink-500 active:cursor-grabbing"
        aria-label={t('setlist.dragHandle')}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', props.entryId);
          props.onDragStart(props.entryId);
        }}
      >
        <Icon name="drag" size={16} />
      </button>
      <div className="min-w-0">
        {props.prominentMemberInstrument !== null ? (
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
        ) : null}
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
          {props.tonalityLabel !== null ? (
            <>
              <span className="text-ink-300">·</span>
              <span className="font-mono text-[10.5px] uppercase tracking-wider">
                {props.tonalityLabel}
              </span>
            </>
          ) : null}
          {props.meanMastery !== null ? (
            <>
              <span className="text-ink-300">·</span>
              <span
                className="font-mono inline-flex items-center gap-1 text-[10.5px]"
                style={{ color: masteryColor(props.meanMastery) }}
              >
                <Icon name="star" size={11} />
                {props.meanMastery.toFixed(1)}
              </span>
            </>
          ) : null}
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
                {field.state.meta.isDirty || props.energy !== null ? field.state.value : '—'}
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
