/**
 * One row of the setlist editor: the song title + artist line, the
 * key/capo/energy/notes controls, the move/delete actions, and the
 * transition-warning button when the previous transition warns.
 */

import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/atoms/Icon';
import { cn } from '../../components/atoms/cn.utils';

const ENERGY_MIN = 1;
const ENERGY_MAX = 10;
const CAPO_MIN = 0;
const CAPO_MAX = 11;

export interface SetlistEntryRowProps {
  readonly entryId: string;
  readonly title: string;
  readonly artist: string;
  readonly keyOverride: string | null;
  readonly capo: number | null;
  readonly energy: number | null;
  readonly notes: string;
  readonly warnTransitionFromSongId: string | null;
  readonly currentSongId: string;
  readonly onUpdate: (entryId: string, patch: Record<string, unknown>) => void;
  readonly onMove: (entryId: string, direction: -1 | 1) => void;
  readonly onRemove: (entryId: string) => void;
  readonly onOpenTransition: (songAId: string, songBId: string) => void;
  readonly onDragStart: (entryId: string) => void;
  readonly onDropOn: (targetEntryId: string) => void;
}

const LABEL_CLASS = 'flex flex-col gap-1 text-[10.5px] tracking-wider uppercase text-ink-400 font-medium';
const FIELD_CLASS =
  'w-full bg-bg-elev border border-line rounded-md px-2 py-1 text-[13px] font-mono text-ink-900 outline-none focus:border-ink-700';

export function SetlistEntryRow(props: SetlistEntryRowProps): JSX.Element {
  const { t } = useTranslation();
  const isWarn = props.warnTransitionFromSongId !== null;
  return (
    <li
      className={cn(
        'grid grid-cols-[auto_1fr_auto] gap-3 items-start bg-bg-elev border rounded-md p-3 transition-colors hover:border-line-strong',
        isWarn ? 'border-warn/40' : 'border-line',
      )}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        props.onDropOn(props.entryId);
      }}
    >
      <button
        type="button"
        className="flex items-center justify-center w-6 h-6 text-ink-300 cursor-grab bg-transparent border-0 hover:text-ink-500"
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
        {isWarn ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 bg-warn-soft text-warn px-2 py-1 rounded-md text-xs font-medium cursor-pointer border-0 mb-2 hover:opacity-90"
            onClick={() =>
              props.onOpenTransition(props.warnTransitionFromSongId ?? '', props.currentSongId)
            }
            aria-label={t('setlist.openTransitionComment')}
          >
            <Icon name="warn" size={12} />
            {t('setlist.transitionWarning')}
          </button>
        ) : null}
        <header className="flex items-baseline gap-2 flex-wrap">
          <span className="font-display italic text-xl text-ink-900 leading-tight">
            {props.title}
          </span>
          <span className="text-[12.5px] text-ink-500">{props.artist}</span>
        </header>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
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
            {t('setlist.energy')}
            <input
              type="number"
              min={ENERGY_MIN}
              max={ENERGY_MAX}
              value={props.energy ?? ''}
              onChange={(event) =>
                props.onUpdate(props.entryId, {
                  energy: event.target.value === '' ? null : Number(event.target.value),
                })
              }
              className={FIELD_CLASS}
            />
          </label>
          <label className={`${LABEL_CLASS} col-span-2 md:col-span-1`}>
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
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => props.onMove(props.entryId, -1)}
          aria-label={t('setlist.moveUp')}
          className="w-7 h-7 inline-flex items-center justify-center text-ink-400 hover:text-ink-900 cursor-pointer bg-transparent border-0"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => props.onMove(props.entryId, 1)}
          aria-label={t('setlist.moveDown')}
          className="w-7 h-7 inline-flex items-center justify-center text-ink-400 hover:text-ink-900 cursor-pointer bg-transparent border-0"
        >
          ↓
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
