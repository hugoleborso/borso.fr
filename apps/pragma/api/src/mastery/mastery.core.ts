/**
 * Effective mastery resolution.
 *
 *   effective(member, instrument, song) = override(member, instrument, song)
 *                                       ?? default(member, instrument)
 *
 * The override table is sparse — only rows where the song deviates
 * from the band-wide default exist. A `0` override is a legitimate
 * value ("ne joue pas") and MUST win over the default — the falsy
 * trap: don't write `override || default`.
 *
 * Aggregations:
 *  - `meanForSong`: arithmetic mean of `effective(member, instrument)`
 *    over the song's lineup, skipping members with no instrument set
 *    or no default+override at all.
 *  - `isRedundantOverride`: true iff override.score === default.score,
 *    so the admin UI can flag rows that should be garbage-collected.
 *
 * Pure functions over plain objects. No I/O.
 */

export type MemberId = string;
export type InstrumentId = string;
export type SongId = string;

export type DefaultMap = Readonly<Record<MemberId, Readonly<Record<InstrumentId, number>>>>;
export type OverrideMap = Readonly<
  Record<SongId, Readonly<Record<MemberId, Readonly<Record<InstrumentId, number>>>>>
>;

export interface MasteryQuery {
  readonly memberId: MemberId;
  readonly instrumentId: InstrumentId;
  readonly songId: SongId;
}

export function effective(
  defaults: DefaultMap,
  overrides: OverrideMap,
  query: MasteryQuery,
): number | null {
  const override = overrides[query.songId]?.[query.memberId]?.[query.instrumentId];
  if (override !== undefined) return override;
  const fallback = defaults[query.memberId]?.[query.instrumentId];
  return fallback ?? null;
}

export interface Lineup {
  readonly [memberId: string]: InstrumentId | null;
}

export function meanForSong(
  defaults: DefaultMap,
  overrides: OverrideMap,
  songId: SongId,
  lineup: Lineup,
): number | null {
  const scores: number[] = [];
  for (const [memberId, instrumentId] of Object.entries(lineup)) {
    if (instrumentId === null) continue;
    const score = effective(defaults, overrides, { memberId, instrumentId, songId });
    if (score === null) continue;
    scores.push(score);
  }
  if (scores.length === 0) return null;
  const sum = scores.reduce((accumulator, score) => accumulator + score, 0);
  return sum / scores.length;
}

export function isRedundantOverride(
  defaults: DefaultMap,
  overrides: OverrideMap,
  query: MasteryQuery,
): boolean {
  const override = overrides[query.songId]?.[query.memberId]?.[query.instrumentId];
  if (override === undefined) return false;
  const fallback = defaults[query.memberId]?.[query.instrumentId];
  return fallback !== undefined && fallback === override;
}
