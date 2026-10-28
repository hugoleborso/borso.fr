/** @Feature takes */

import { compareTakesNewestFirst, type OrderedTake } from '../../lib/queries/takes.utils';
import type { QueuedTake } from '../../lib/take-queue.core';

export interface ListedTakeSummary extends OrderedTake {
  readonly sessionId: string | null;
  readonly durationSeconds: number;
  readonly authorName: string | null;
  readonly commentCount: number;
}

export type TakeListRow<TTake extends ListedTakeSummary> =
  | {
      readonly kind: 'listed';
      readonly id: string;
      readonly recordedAt: string;
      readonly take: TTake;
    }
  | {
      readonly kind: 'pending' | 'failed';
      readonly id: string;
      readonly recordedAt: string;
      readonly take: QueuedTake;
    };

// @FollowsBlueprint core-view-projection
export function mergePendingTakes<TTake extends ListedTakeSummary>(
  serverTakes: readonly TTake[],
  queuedTakes: readonly QueuedTake[],
  songId: string,
): TakeListRow<TTake>[] {
  const listedIds = new Set(serverTakes.map((take) => take.id));
  const listed = serverTakes.map((take): TakeListRow<TTake> => ({
    kind: 'listed',
    id: take.id,
    recordedAt: take.recordedAt,
    take,
  }));
  const pending = queuedTakes
    .filter((take) => take.songId === songId && !listedIds.has(take.id))
    .map((take): TakeListRow<TTake> => ({
      kind: take.hasFailed ? 'failed' : 'pending',
      id: take.id,
      recordedAt: take.recordedAt,
      take,
    }));
  return [...listed, ...pending].sort(compareTakesNewestFirst);
}

export interface SessionSummary {
  readonly id: string;
  readonly kind: string;
  readonly venue: string | null;
}

export type TakeSessionKey =
  | 'takes.noSession'
  | 'takes.practice'
  | 'takes.concert'
  | 'takes.unknownSession';

export interface TakeSessionLabel {
  readonly key: TakeSessionKey;
  readonly venue: string | null;
}

const CONCERT_KIND = 'concert';

// @FollowsBlueprint core-decision
export function describeTakeSession(
  sessionId: string | null,
  sessions: readonly SessionSummary[],
): TakeSessionLabel {
  if (sessionId === null) return { key: 'takes.noSession', venue: null };
  const session = sessions.find((candidate) => candidate.id === sessionId);
  if (session === undefined) return { key: 'takes.unknownSession', venue: null };
  if (session.kind === CONCERT_KIND) return { key: 'takes.concert', venue: session.venue };
  return { key: 'takes.practice', venue: null };
}

export interface TakeRowView {
  readonly isListed: boolean;
  readonly isPending: boolean;
  readonly hasFailed: boolean;
  readonly session: TakeSessionLabel;
  readonly durationSeconds: number | null;
  readonly author: { readonly name: string | null } | null;
  readonly commentCount: number | null;
}

// @FollowsBlueprint core-view-projection
export function describeTakeRow<TTake extends ListedTakeSummary>(
  row: TakeListRow<TTake>,
  sessions: readonly SessionSummary[],
): TakeRowView {
  const common = {
    isListed: row.kind === 'listed',
    isPending: row.kind === 'pending',
    hasFailed: row.kind === 'failed',
    session: describeTakeSession(row.take.sessionId, sessions),
    durationSeconds: row.take.durationSeconds > 0 ? row.take.durationSeconds : null,
  };
  if (row.kind !== 'listed') return { ...common, author: null, commentCount: null };
  return {
    ...common,
    author: { name: row.take.authorName },
    commentCount: row.take.commentCount,
  };
}

export interface PracticeTakesInput<TTake extends ListedTakeSummary & { readonly songId: string }> {
  readonly sessionTakes: readonly TTake[];
  readonly queuedTakes: readonly QueuedTake[];
  readonly sessionId: string;
  readonly songId: string;
  readonly selectedTakeId: string | null;
}

export interface PracticeTakes<TTake extends ListedTakeSummary> {
  readonly rows: TakeListRow<TTake>[];
  readonly selectedTake: TTake | null;
}

export function selectPracticeTakes<TTake extends ListedTakeSummary & { readonly songId: string }>(
  input: PracticeTakesInput<TTake>,
): PracticeTakes<TTake> {
  const songTakes = input.sessionTakes.filter((take) => take.songId === input.songId);
  return {
    rows: mergePendingTakes(
      songTakes,
      input.queuedTakes.filter((take) => take.sessionId === input.sessionId),
      input.songId,
    ),
    selectedTake: songTakes.find((take) => take.id === input.selectedTakeId) ?? null,
  };
}
