import type { Runner } from '../runner/runner.types';

export type RunnerStatus =
  | { readonly kind: 'in-race'; readonly lastLoop: number }
  | { readonly kind: 'dnf'; readonly outAtLoop: number; readonly reason: 'late' | 'manual' };

export interface RankedRunner {
  readonly runner: Runner;
  readonly rank: number | 'ex-aequo';
  readonly status: RunnerStatus;
  readonly lastLoopDurationMs: number | null;
  readonly lastFinishedAt: Date | null;
}

export interface Standings {
  readonly editionSlug: string;
  readonly computedAt: Date;
  readonly raceEnded: boolean;
  readonly ranked: readonly RankedRunner[];
}
