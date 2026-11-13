import { randomUUID } from 'node:crypto';
import { reportUnhandledError } from '../helpers/observability/error-reporting.adapter';
import { fireRoutine } from '../helpers/routine/routine-fire.adapter';
import { insertRoutineRun, listNewestRoutineRuns, type RoutineRunRow } from './routine.repository';

const RECENT_ROUTINE_RUN_LIMIT = 20;

type FiredRun = Omit<RoutineRunRow, 'id'>;

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
export async function launchProposalRun(memorySlug: string, now: Date): Promise<void> {
  await fireAndStoreProposalRun(memorySlug, now).catch(reportUnhandledError);
}

export async function listRoutineRuns(): Promise<RoutineRunRow[]> {
  return await listNewestRoutineRuns(RECENT_ROUTINE_RUN_LIMIT);
}
