/**
 * One row of the setlist editor: the song title + artist line, the
 * key/capo/energy/notes controls, the move/delete actions, and the
 * transition-warning button when the previous transition warns.
 */

import { useTranslation } from 'react-i18next';

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
}

export function SetlistEntryRow(props: SetlistEntryRowProps): JSX.Element {
  const { t } = useTranslation();
  const isWarn = props.warnTransitionFromSongId !== null;
  return (
    <li className={isWarn ? 'setlist-entry is-warn' : 'setlist-entry'}>
      {isWarn ? (
        <button
          type="button"
          className="setlist-entry-transition"
          onClick={() =>
            props.onOpenTransition(props.warnTransitionFromSongId ?? '', props.currentSongId)
          }
          aria-label={t('setlist.openTransitionComment')}
        >
          ⚠ {t('setlist.transitionWarning')}
        </button>
      ) : null}
      <header className="setlist-entry-title">
        <span>{props.title}</span>
        <span className="setlist-entry-artist">{props.artist}</span>
      </header>
      <div className="setlist-entry-controls">
        <label className="setlist-entry-label">
          {t('setlist.keyOverride')}
          <input
            type="text"
            value={props.keyOverride ?? ''}
            onChange={(event) =>
              props.onUpdate(props.entryId, {
                keyOverride: event.target.value.length === 0 ? null : event.target.value,
              })
            }
          />
        </label>
        <label className="setlist-entry-label">
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
          />
        </label>
        <label className="setlist-entry-label">
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
          />
        </label>
        <label className="setlist-entry-label setlist-entry-label--wide">
          {t('setlist.notes')}
          <input
            type="text"
            value={props.notes}
            onChange={(event) =>
              props.onUpdate(props.entryId, { notes: event.target.value })
            }
          />
        </label>
      </div>
      <div className="setlist-entry-actions">
        <button
          type="button"
          onClick={() => props.onMove(props.entryId, -1)}
          aria-label={t('setlist.moveUp')}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => props.onMove(props.entryId, 1)}
          aria-label={t('setlist.moveDown')}
        >
          ↓
        </button>
        <button
          type="button"
          className="admin-page-row-delete"
          onClick={() => props.onRemove(props.entryId)}
          aria-label={t('setlist.removeEntry')}
        >
          ×
        </button>
      </div>
    </li>
  );
}
