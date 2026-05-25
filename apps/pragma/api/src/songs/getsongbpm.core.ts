/**
 * Pure GetSongBPM response mapper. Takes the JSON the upstream
 * `https://api.getsongbpm.com/search/` endpoint returns (`{ search:
 * [{ key_of, tempo, time_sig, duration, ... }] }`) and projects the
 * FIRST entry onto a typed hit for our search proxy. The mapper is
 * permissive — every upstream field can be missing, the wrong type,
 * or carry a long-form key like `"C major"` — and returns `null` when
 * nothing useful can be extracted.
 *
 * Key normalisation: GetSongBPM mostly emits canonical short-form keys
 * (`"C"`, `"C#m"`, `"Bbm"`) which we keep as-is to match
 * `tonality.core.ts`'s `[root][quality]` grammar. Long-form variants
 * (`"C major"`, `"F minor"`, `"Cmaj"`) are reconciled to the same
 * canonical short form via a small mapping table.
 *
 * Live HTTP, rate-limit and cache live in `songs.service.ts`; this
 * file is IO-free and gated at 100% coverage by the `core` Vitest
 * project.
 */

import { z } from 'zod';

export interface GetSongBpmHit {
  readonly tonality: string | null;
  readonly bpm: number | null;
  readonly durationSeconds: number | null;
  readonly timeSignature: string | null;
}

const SECONDS_PER_MINUTE = 60;
const DURATION_PARTS_MMSS = 2;
const KEY_ROOT_REGEX = /^[A-G][#b]?/;

const responseSchema = z.object({
  search: z
    .union([
      z.array(
        z.object({
          key_of: z.string().optional().nullable(),
          tempo: z.union([z.string(), z.number()]).optional().nullable(),
          time_sig: z.string().optional().nullable(),
          duration: z.union([z.string(), z.number()]).optional().nullable(),
        }),
      ),
      z.object({}).passthrough(),
    ])
    .optional(),
});

const LONG_FORM_QUALITY: Record<string, string> = {
  major: '',
  maj: '',
  minor: 'm',
  min: 'm',
  m: 'm',
};

function normaliseKey(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const rootMatch = trimmed.match(KEY_ROOT_REGEX)?.[0];
  if (rootMatch === undefined) return null;
  const root = rootMatch;
  const rest = trimmed.slice(root.length).trim();
  if (rest.length === 0) return root;
  const lower = rest.toLowerCase();
  const longFormQuality = LONG_FORM_QUALITY[lower];
  if (longFormQuality !== undefined) {
    return `${root}${longFormQuality}`;
  }
  // Already a short-form quality token like `m`, `m7`, `sus4` — keep
  // verbatim. Anything we don't recognise stays as-typed; the UI
  // shows it next to the user-editable tonality input.
  return `${root}${rest}`;
}

function parseBpm(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric);
}

function parseDuration(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return Math.round(raw);
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length !== DURATION_PARTS_MMSS) return null;
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
    if (minutes < 0 || seconds < 0) return null;
    return minutes * SECONDS_PER_MINUTE + seconds;
  }
  const asNumber = Number(trimmed);
  if (!Number.isFinite(asNumber) || asNumber <= 0) return null;
  return Math.round(asNumber);
}

function nonEmptyOrNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function parseGetSongBpmResponse(payload: unknown): GetSongBpmHit | null {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) return null;
  const search = parsed.data.search;
  if (!Array.isArray(search)) return null;
  const first = search[0];
  if (first === undefined) return null;
  const tonality = normaliseKey(first.key_of);
  const bpm = parseBpm(first.tempo);
  const durationSeconds = parseDuration(first.duration);
  const timeSignature = nonEmptyOrNull(first.time_sig);
  if (tonality === null && bpm === null && durationSeconds === null && timeSignature === null) {
    return null;
  }
  return {
    tonality,
    bpm,
    durationSeconds,
    timeSignature,
  };
}
