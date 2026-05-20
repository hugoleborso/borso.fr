/**
 * One row of the setlist editor. Mirrors the prototype's `.sl-row`
 * (design-bundle/styles.css lines 312-336): a five-cell grid with
 *  - position number (mono),
 *  - drag handle (icon button, gives the row its draggable
 *    affordance — handled by the parent via `onDragStart`),
 *  - song title (font-display italic) + submeta (artist · tonality ·
 *    mastery) + member-chip lineup,
 *  - energy slider (1-10) + numeric tag,
 *  - actions menu (currently just a delete button; key/capo/notes
 *    are surfaced via the existing `details` accordion below the
 *    row when needed).
 *
 * Round-6 change vs round-5: the inline key/capo/notes form rows are
 * gone; the row now leads with the editorial display per the
 * prototype. The "more" affordance toggles the inline editor for
 * key/capo/notes when the operator needs it.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/atoms/Icon';
import { type LineupMember, MemberLineup } from '../../components/molecules/MemberLineup';
import { cn } from '../../components/atoms/cn.utils';

const ENERGY_MIN = 1;
const ENERGY_MAX = 10;
const CAPO_MIN = 0;
const CAPO_MAX = 11;

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
  readonly members: readonly LineupMember[];
  readonly instruments: readonly { id: string; name: string }[];
  readonly onUpdate: (entryId: string, patch: Record<string, unknown>) => void;
  readonly onRemove: (entryId: string) => void;
  readonly onDragStart: (entryId: string) => void;
  readonly onDropOn: (targetEntryId: string) => void;
}

const FIELD_CLASS =
  'w-full bg-bg-elev border border-line rounded-md px-2 py-1 text-[13px] font-mono text-ink-900 outline-none focus:border-ink-700';
const LABEL_CLASS = 'flex flex-col gap-1 text-[10.5px] tracking-wider uppercase text-ink-400 font-medium';

function masteryColor(score: number | null): string {
  if (score === null) return 'var(--color-ink-400)';
  if (score >= 7) return 'var(--color-good)';
  if (score >= 5) return 'var(--color-warn)';
  return 'var(--color-danger)';
}

export function SetlistEntryRow(props: SetlistEntryRowProps): JSX.Element {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState<boolean>(false);
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
            <label className={LABEL_CLASS}>
              {t('setlist.keyOverride')}
              <input
                type="text"
                value={props.keyOverride ?? ''}
                onChange={(event) =>
                  props.onUpdate(props.entryId, {
                    keyOverride: event.target.value.length === 0 ? null : event.target.value,
                  })
                }
                className={FIELD_CLASS}
              />
            </label>
            <label className={LABEL_CLASS}>
              {t('setlist.capo')}
              <input
                type="number"
                min={CAPO_MIN}
                max={CAPO_MAX}
                value={props.capo ?? ''}
                onChange={(event) =>
                  props.onUpdate(props.entryId, {
                    capo: event.target.value === '' ? null : Number(event.target.value),
                  })
                }
                className={FIELD_CLASS}
              />
            </label>
            <label className={LABEL_CLASS}>
              {t('setlist.notes')}
              <input
                type="text"
                value={props.notes}
                onChange={(event) =>
                  props.onUpdate(props.entryId, { notes: event.target.value })
                }
                className={FIELD_CLASS}
              />
            </label>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-500 min-w-[22px] text-center">
          {props.energy ?? '—'}
        </span>
        <input
          type="range"
          min={ENERGY_MIN}
          max={ENERGY_MAX}
          value={props.energy ?? 5}
          onChange={(event) =>
            props.onUpdate(props.entryId, { energy: Number(event.target.value) })
          }
          aria-label={t('setlist.energy')}
          className="w-22 accent-accent"
          style={{ width: 88 }}
        />
      </div>
      <div className="flex flex-col gap-1">
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
    </li>
  );
}
