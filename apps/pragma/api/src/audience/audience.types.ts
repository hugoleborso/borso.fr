import type { PoolEntry } from './pool.core';

export const AUDIENCE_REFUSALS = [
  'not-a-concert',
  'round-already-open',
  'round-closed',
  'duplicate-vote',
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
 * @BlueprintDescription Every refusing function returns `Refused` in its outcome union rather than throwing, carrying a machine-readable reason drawn from a closed union, so the controller indexes a frozen status table with it in a guard clause instead of matching seven error classes. Returning beats throwing here because Hono turns an exception a handler lets escape into a 500 before any middleware of ours can read it, and because the compiler then refuses the handler that forgot a branch. Adding a refusal is a union member and a table row, and the table that forgot it does not compile.
 */
export interface Refused {
  readonly kind: 'refused';
  readonly reason: AudienceRefusal;
}

export function refuse(reason: AudienceRefusal): Refused {
  return { kind: 'refused', reason };
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

export interface RoundHistoryView extends RoundView {
  readonly winningSongTitle: string | null;
}

export interface ConcertVoteState {
  readonly round: RoundView | null;
  readonly pool: readonly PoolEntry[];
  readonly ownVotes: readonly string[];
  readonly ballotCount: number;
  readonly capacity: number | null;
}
