import { randomUUID } from 'node:crypto';
import { RECENT_ROUTINE_RUN_LIMIT } from '@domain/routine-run.core';
import { TalosError } from '../helpers/errors/talos-error.types';
import { reportUnhandledError } from '../helpers/observability/error-reporting.adapter';
import { fireRoutine } from '../helpers/routine/routine-fire.adapter';
import type { RoutineTrigger } from '../helpers/routine/routine-fire.core';
import { cutMessageSubject } from './routine.core';
import { insertRoutineRun, listNewestRoutineRuns, type RoutineRunRow } from './routine.repository';

interface FiredRun {
  readonly trigger: RoutineTrigger;
  readonly subject: string;
  readonly sessionUrl: string | null;
  readonly firedAt: Date;
}

async function storeRoutineRun(firedRun: FiredRun): Promise<RoutineRunRow> {
  const run = { id: randomUUID(), ...firedRun };
  await insertRoutineRun(run);
  return run;
}

async function fireAndStoreProposalRun(memorySlug: string, now: Date): Promise<void> {
  const outcome = await fireRoutine('proposition', memorySlug);
  if (outcome.kind !== 'fired') return;
  await storeRoutineRun({
    trigger: 'proposition',
    subject: memorySlug,
    sessionUrl: outcome.sessionUrl,
    firedAt: now,
  });
}

// @FollowsBlueprint service-orchestration
export async function launchMessageRun(message: string, now: Date): Promise<RoutineRunRow> {
  const outcome = await fireRoutine('message', message);
  if (outcome.kind === 'skipped') throw new TalosError('not-configured');
  if (outcome.kind === 'failed') throw new TalosError('routine-fire-failed');
  return await storeRoutineRun({
    trigger: 'message',
    subject: cutMessageSubject(message),
    sessionUrl: outcome.sessionUrl,
    firedAt: now,
  });
}

export async function launchProposalRun(memorySlug: string, now: Date): Promise<void> {
  await fireAndStoreProposalRun(memorySlug, now).catch(reportUnhandledError);
}

export async function listRoutineRuns(): Promise<RoutineRunRow[]> {
  return await listNewestRoutineRuns(RECENT_ROUTINE_RUN_LIMIT);
}
