import type { PoolEntry } from './pool.core';

export const AUDIENCE_REFUSALS = [
  'not-a-concert',
  'round-already-open',
  'round-closed',
  'song-not-in-pool',
  'song-already-planned',
  'unknown-suggestion',
  'external-search-unavailable',
] as const;

export type AudienceRefusal = (typeof AUDIENCE_REFUSALS)[number];

/**
 * @Blueprint domain-refusal-with-reason
 * @BlueprintName Refusal Carrying Its Reason
 * @BlueprintUsage Use for a slice whose refusals are many and whose controller has to answer a different status code for each.
 * @BlueprintDescription One error class rather than one per refusal, carrying a machine-readable reason drawn from a closed union, so the caller indexes a frozen status table with it instead of matching seven classes or parsing a message. `name` is overridden with a string literal, because a subclass otherwise inherits `Error.prototype.name` and calls itself `Error`. Adding a refusal is a union member and a table row, and the compiler refuses the table that forgot it.
 */
export class AudienceRefusedError extends Error {
  override readonly name = 'AudienceRefusedError';
  constructor(public readonly reason: AudienceRefusal) {
    super(`the audience request was refused: ${reason}`);
  }
}

export interface RoundView {
  readonly id: string;
  readonly openedAt: string;
  readonly closesAt: string;
  readonly remainingSeconds: number;
  readonly isOpen: boolean;
  readonly isSettled: boolean;
  readonly winningSongId: string | null;
}

export interface ConcertVoteState {
  readonly round: RoundView | null;
  readonly pool: readonly PoolEntry[];
  readonly ownVotes: readonly string[];
  readonly ballotCount: number;
  readonly capacity: number | null;
}
