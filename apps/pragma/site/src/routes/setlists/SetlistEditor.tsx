/**
 * Setlist editor. Embedded inside the concert session detail page.
 * Renders the ordered entries; each row carries an inline display
 * (title, artist, tonality, mastery, lineup, energy slider). The
 * energy sparkline sits ABOVE the list, derived from the per-entry
 * energy values.
 *
 * Reordering uses HTML5 drag-from-handle. The up/down arrow keyboard
 * fallback is dropped in round-6 because the prototype only ships
 * drag (and screen-reader operators have the dragHandle aria-label
 * + the button-with-focus to drive accessible reorder).
 *
 * Transition warnings are computed by `transition.core.ts` between
 * each consecutive pair; a warned pair carries a circular orange
 * marker in the SIDE GUTTER (left of the list, between the two
 * rows it warns about) — the prototype's `.sl-warning-gutter`. The
 * marker opens the TransitionCommentModal.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { EnergySparkline } from '../../components/molecules/EnergySparkline';
import { Icon } from '../../components/atoms/Icon';
import { ApiError, apiRequest } from '../../lib/api-client';
import { evaluateTransition } from '@api/setlists/transition.core';
import { SetlistEntryRow } from './SetlistEntryRow';
import { TransitionCommentModal } from './TransitionCommentModal';
import {
  compactLineup,
  instrumentHarmonicMap,
  lineupOf,
  tonalityLabelFor,
} from './setlist-editor.utils';

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
  tonalityStart: z.string().nullable().optional(),
  tonalityEnd: z.string().nullable().optional(),
  defaultLineup: z.record(z.string(), z.string().nullable()),
});
const songListSchema = z.object({ songs: z.array(songSchema.passthrough()) });

const instrumentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isHarmonic: z.boolean(),
});
const instrumentListSchema = z.object({ instruments: z.array(instrumentSchema) });

const memberSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  color: z.string(),
});
const memberListSchema = z.object({ members: z.array(memberSchema) });

type Entry = z.infer<typeof entrySchema>;
type Song = z.infer<typeof songSchema>;
type Instrument = z.infer<typeof instrumentSchema>;
type Member = z.infer<typeof memberSchema>;

interface SetlistEditorProps {
  readonly setlistId: string;
}

export function SetlistEditor({ setlistId }: SetlistEditorProps): JSX.Element {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitionEditing, setTransitionEditing] = useState<
    { songAId: string; songBId: string } | null
  >(null);
  const [draggingEntryId, setDraggingEntryId] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [entriesBody, songsBody, instrumentsBody, membersBody] = await Promise.all([
        apiRequest(`/api/setlists/${setlistId}/entries`).then((body) =>
          entryListSchema.parse(body),
        ),
        apiRequest('/api/songs').then((body) => songListSchema.parse(body)),
        apiRequest('/api/instruments').then((body) => instrumentListSchema.parse(body)),
        apiRequest('/api/members').then((body) => memberListSchema.parse(body)),
      ]);
      setEntries(entriesBody.entries);
      const parsedSongs: Song[] = [];
      for (const row of songsBody.songs) {
        const parsed = songSchema.safeParse(row);
        if (parsed.success) parsedSongs.push(parsed.data);
      }
      setSongs(parsedSongs);
      setInstruments(instrumentsBody.instruments);
      setMembers(membersBody.members);
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

  const instruments_ = useMemo(() => instrumentHarmonicMap(instruments), [instruments]);

  const lineupMembers = useMemo(
    () => members.map((member) => ({ id: member.id, name: member.firstName, color: member.color })),
    [members],
  );

  const energyValues = useMemo(() => entries.map((entry) => entry.energy), [entries]);

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
        <EnergySparkline values={energyValues} height={80} />
      </div>
      {/*
        The list lives inside a relative wrapper so the absolute
        warning gutter (left side, between consecutive entries) can
        position itself by row index. Each warning marker sits at the
        height of the gap between rows i and i+1.
      */}
      <div className="relative">
        <div
          className="absolute -left-6 top-0 bottom-0 w-5 pointer-events-none"
          aria-hidden="true"
        >
          {transitions.map((kind, gapIndex) => {
            if (kind !== 'warn') return null;
            const leftEntry = entries[gapIndex];
            const rightEntry = entries[gapIndex + 1];
            if (leftEntry === undefined || rightEntry === undefined) return null;
            // Each entry row is approximately 80px tall plus an 8px
            // gap; the marker sits at the boundary between rows i
            // and i+1, accounting for the wrapper's flex-gap.
            const offsetPx = (gapIndex + 1) * (84 + 8) - 12;
            return (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: warnings are tied to a stable entry pair, the gap index is the natural key
                key={`gap-${gapIndex}`}
                type="button"
                className="pointer-events-auto absolute left-0 w-5 h-5 rounded-full bg-warn text-bg-elev font-bold text-[11px] inline-flex items-center justify-center cursor-pointer border-0 shadow-[0_2px_6px_rgba(184,132,26,0.4)] hover:opacity-90"
                style={{ top: offsetPx }}
                aria-label={t('setlist.openTransitionComment')}
                onClick={() =>
                  setTransitionEditing({
                    songAId: leftEntry.songId,
                    songBId: rightEntry.songId,
                  })
                }
              >
                <Icon name="warn" size={12} />
              </button>
            );
          })}
        </div>
        <ul className="flex flex-col gap-2">
          {entries.map((entry, index) => {
            const song = songsById[entry.songId];
            const lineupRaw = lineupOf(entry, songsById);
            return (
              <SetlistEntryRow
                key={entry.id}
                position={index + 1}
                entryId={entry.id}
                title={song?.title ?? entry.songId.slice(0, 8)}
                artist={song?.artist ?? ''}
                tonalityLabel={tonalityLabelFor(song)}
                meanMastery={null}
                keyOverride={entry.keyOverride}
                capo={entry.capo}
                energy={entry.energy}
                notes={entry.notes}
                currentSongId={entry.songId}
                lineup={compactLineup(lineupRaw)}
                members={lineupMembers}
                instruments={instruments}
                onUpdate={(id, patch) => void updateEntry(id, patch)}
                onRemove={(id) => void removeEntry(id)}
                onDragStart={(id) => setDraggingEntryId(id)}
                onDropOn={(id) => void dropOnEntry(id)}
              />
            );
          })}
        </ul>
      </div>
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
