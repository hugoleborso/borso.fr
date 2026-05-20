/**
 * Setlist editor. Embedded inside the concert/practice session detail
 * page. Renders the ordered entries; each row shows the song title,
 * the key/capo overrides, the energy slider, and a notes field. Above
 * the list, the energy sparkline derived from `energy-curve.core.ts`.
 *
 * Reordering uses HTML5 drag-from-handle per the design bundle's
 * mobile-drag pattern (closes blocker A18). The up/down arrow buttons
 * stay as a keyboard / a11y fallback — both routes call the same
 * server reorder API.
 *
 * Transition warnings are computed by `transition.core.ts` between
 * each consecutive pair; a warned row carries an inline button that
 * opens the transition-comment modal.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ApiError, apiRequest } from '../../lib/api-client';
import { evaluateTransition } from '@api/setlists/transition.core';
import { SetlistEntryRow } from './SetlistEntryRow';
import { sparklinePath } from './sparkline.utils';
import { TransitionCommentModal } from './TransitionCommentModal';

const SPARKLINE_GEOMETRY = { width: 320, height: 48, padding: 4 } as const;

const entrySchema = z.object({
  id: z.string().uuid(),
  setlistId: z.string().uuid(),
  songId: z.string().uuid(),
  position: z.number().int(),
  lineupOverride: z.record(z.string(), z.string().nullable()).nullable(),
  energy: z.number().int().nullable(),
  keyOverride: z.string().nullable(),
  capo: z.number().int().nullable(),
  notes: z.string(),
});
const entryListSchema = z.object({ entries: z.array(entrySchema) });
const singleEntrySchema = z.object({ entry: entrySchema });

const songSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artist: z.string(),
  defaultLineup: z.record(z.string(), z.string().nullable()),
});
const songListSchema = z.object({ songs: z.array(songSchema.passthrough()) });

const instrumentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isHarmonic: z.boolean(),
});
const instrumentListSchema = z.object({ instruments: z.array(instrumentSchema) });

type Entry = z.infer<typeof entrySchema>;
type Song = z.infer<typeof songSchema>;
type Instrument = z.infer<typeof instrumentSchema>;

interface SetlistEditorProps {
  readonly setlistId: string;
}

function instrumentMap(instruments: readonly Instrument[]): Record<string, { isHarmonic: boolean }> {
  const out: Record<string, { isHarmonic: boolean }> = {};
  for (const row of instruments) out[row.id] = { isHarmonic: row.isHarmonic };
  return out;
}

function lineupOf(entry: Entry, songsById: Record<string, Song>): Record<string, string | null> {
  if (entry.lineupOverride !== null) return entry.lineupOverride;
  return songsById[entry.songId]?.defaultLineup ?? {};
}

export function SetlistEditor({ setlistId }: SetlistEditorProps): JSX.Element {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitionEditing, setTransitionEditing] = useState<
    { songAId: string; songBId: string } | null
  >(null);
  const [draggingEntryId, setDraggingEntryId] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [entriesBody, songsBody, instrumentsBody] = await Promise.all([
        apiRequest(`/api/setlists/${setlistId}/entries`).then((body) =>
          entryListSchema.parse(body),
        ),
        apiRequest('/api/songs').then((body) => songListSchema.parse(body)),
        apiRequest('/api/instruments').then((body) => instrumentListSchema.parse(body)),
      ]);
      setEntries(entriesBody.entries);
      const parsedSongs: Song[] = [];
      for (const row of songsBody.songs) {
        const parsed = songSchema.safeParse(row);
        if (parsed.success) parsedSongs.push(parsed.data);
      }
      setSongs(parsedSongs);
      setInstruments(instrumentsBody.instruments);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    } finally {
      setLoading(false);
    }
  }, [setlistId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const songsById = useMemo(() => {
    const out: Record<string, Song> = {};
    for (const song of songs) out[song.id] = song;
    return out;
  }, [songs]);

  const instruments_ = useMemo(() => instrumentMap(instruments), [instruments]);

  const energyValues = useMemo(
    () => entries.map((entry) => entry.energy),
    [entries],
  );

  const transitions = useMemo(() => {
    const out: ('safe' | 'warn')[] = [];
    for (let index = 0; index < entries.length - 1; index += 1) {
      const left = entries[index];
      const right = entries[index + 1];
      if (left === undefined || right === undefined) continue;
      const verdict = evaluateTransition(
        lineupOf(left, songsById),
        lineupOf(right, songsById),
        instruments_,
      );
      out.push(verdict.kind);
    }
    return out;
  }, [entries, songsById, instruments_]);

  const addEntry = async (songId: string): Promise<void> => {
    try {
      const created = singleEntrySchema.parse(
        await apiRequest(`/api/setlists/${setlistId}/entries`, {
          method: 'POST',
          body: { songId },
        }),
      );
      setEntries((current) => [...current, created.entry]);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  const removeEntry = async (entryId: string): Promise<void> => {
    try {
      await apiRequest(`/api/setlists/${setlistId}/entries/${entryId}`, { method: 'DELETE' });
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  const move = async (entryId: string, direction: -1 | 1): Promise<void> => {
    const ordered = entries.map((entry) => entry.id);
    const fromIndex = ordered.indexOf(entryId);
    const toIndex = fromIndex + direction;
    if (fromIndex === -1 || toIndex < 0 || toIndex >= ordered.length) return;
    const next = [...ordered];
    const moved = next.splice(fromIndex, 1)[0];
    if (moved === undefined) return;
    next.splice(toIndex, 0, moved);
    try {
      await apiRequest(`/api/setlists/${setlistId}/reorder`, {
        method: 'PUT',
        body: { entryIds: next },
      });
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  const dropOnEntry = async (targetEntryId: string): Promise<void> => {
    const draggedId = draggingEntryId;
    setDraggingEntryId(null);
    if (draggedId === null || draggedId === targetEntryId) return;
    const ordered = entries.map((entry) => entry.id);
    const fromIndex = ordered.indexOf(draggedId);
    const toIndex = ordered.indexOf(targetEntryId);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...ordered];
    const moved = next.splice(fromIndex, 1)[0];
    if (moved === undefined) return;
    next.splice(toIndex, 0, moved);
    try {
      await apiRequest(`/api/setlists/${setlistId}/reorder`, {
        method: 'PUT',
        body: { entryIds: next },
      });
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  const updateEntry = async (entryId: string, patch: Record<string, unknown>): Promise<void> => {
    try {
      const updated = singleEntrySchema.parse(
        await apiRequest(`/api/setlists/${setlistId}/entries/${entryId}`, {
          method: 'PUT',
          body: patch,
        }),
      );
      setEntries((current) => current.map((row) => (row.id === entryId ? updated.entry : row)));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  if (loading) {
    return <p className="text-ink-400 italic text-sm">{t('common.loading')}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error !== null ? (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <div className="bg-bg-elev border border-line rounded-lg p-4">
        <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-400 mb-2">
          {t('setlist.energy')}
        </div>
        <svg
          width={SPARKLINE_GEOMETRY.width}
          height={SPARKLINE_GEOMETRY.height}
          viewBox={`0 0 ${SPARKLINE_GEOMETRY.width} ${SPARKLINE_GEOMETRY.height}`}
          aria-label={t('setlist.energy')}
          className="w-full h-12"
          preserveAspectRatio="none"
        >
          <path
            d={sparklinePath(energyValues, SPARKLINE_GEOMETRY)}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <ul className="flex flex-col gap-2">
        {entries.map((entry, index) => {
          const song = songsById[entry.songId];
          const previousSongId =
            transitions[index - 1] === 'warn' ? (entries[index - 1]?.songId ?? null) : null;
          return (
            <SetlistEntryRow
              key={entry.id}
              entryId={entry.id}
              title={song?.title ?? entry.songId.slice(0, 8)}
              artist={song?.artist ?? ''}
              keyOverride={entry.keyOverride}
              capo={entry.capo}
              energy={entry.energy}
              notes={entry.notes}
              warnTransitionFromSongId={previousSongId}
              currentSongId={entry.songId}
              onUpdate={(id, patch) => void updateEntry(id, patch)}
              onMove={(id, direction) => void move(id, direction)}
              onRemove={(id) => void removeEntry(id)}
              onOpenTransition={(songAId, songBId) =>
                setTransitionEditing({ songAId, songBId })
              }
              onDragStart={(id) => setDraggingEntryId(id)}
              onDropOn={(id) => void dropOnEntry(id)}
            />
          );
        })}
      </ul>
      <details className="bg-bg-sunk border border-line rounded-md p-3">
        <summary className="cursor-pointer text-sm text-ink-700 font-medium">
          {t('setlist.addSong')}
        </summary>
        <ul className="flex flex-col gap-1 mt-3">
          {songs
            .toSorted((left, right) => left.title.localeCompare(right.title))
            .map((song) => (
              <li key={song.id}>
                <button
                  type="button"
                  onClick={() => void addEntry(song.id)}
                  className="w-full text-left bg-transparent border-0 text-[13px] text-ink-700 hover:bg-bg-elev px-2 py-1 rounded-md cursor-pointer transition-colors"
                >
                  + {song.title}
                </button>
              </li>
            ))}
        </ul>
      </details>
      {transitionEditing !== null ? (
        <TransitionCommentModal
          songAId={transitionEditing.songAId}
          songBId={transitionEditing.songBId}
          onClose={() => setTransitionEditing(null)}
        />
      ) : null}
    </div>
  );
}

