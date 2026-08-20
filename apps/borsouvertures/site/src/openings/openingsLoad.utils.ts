import type { Opening } from './types';

export type OpeningsLoadStatus = 'loaded' | 'failed';

export interface OpeningsLoad {
  status: OpeningsLoadStatus;
  openings: Opening[];
}

export type OpeningsLoadOutcome = { ok: true; openings: Opening[] } | { ok: false; error: Error };

// @FollowsBlueprint utils-pure-module
export function selectOpeningsLoad(outcome: OpeningsLoadOutcome): OpeningsLoad {
  if (outcome.ok) return { status: 'loaded', openings: outcome.openings };
  return { status: 'failed', openings: [] };
}
