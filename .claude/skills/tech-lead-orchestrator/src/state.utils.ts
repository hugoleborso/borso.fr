import { createHash } from 'node:crypto';
import {
  OrchestratorSpecMutationAttemptedError,
  type OrchestratorStage,
  type OrchestratorState,
} from './types';

const SHA_ALGORITHM = 'sha256';

export function specChecksum(content: string): string {
  return createHash(SHA_ALGORITHM).update(content).digest('hex');
}

export function assertSpecUnchanged(previousChecksum: string, currentContent: string): void {
  const currentChecksum = specChecksum(currentContent);
  if (currentChecksum !== previousChecksum) {
    throw new OrchestratorSpecMutationAttemptedError(previousChecksum, currentChecksum);
  }
}

export function initialState(input: {
  runId: string;
  app: string;
  slug: string;
  now: string;
}): OrchestratorState {
  return {
    runId: input.runId,
    feature: { app: input.app, slug: input.slug },
    pilotedByTechLead: true,
    stage: 'spec',
    retries: { implement: 0, validate: 0 },
    adrIndex: [],
    bytesRead: 0,
    specChecksum: null,
    startedAt: input.now,
    updatedAt: input.now,
  };
}

export function advanceStage(
  state: OrchestratorState,
  nextStage: OrchestratorStage,
  now: string,
): OrchestratorState {
  return { ...state, stage: nextStage, updatedAt: now };
}

export function incrementRetry(
  state: OrchestratorState,
  which: 'implement' | 'validate',
  now: string,
): OrchestratorState {
  const retries = { ...state.retries, [which]: state.retries[which] + 1 };
  return { ...state, retries, updatedAt: now };
}

export function recordSpecChecksum(
  state: OrchestratorState,
  specContent: string,
  now: string,
): OrchestratorState {
  return { ...state, specChecksum: specChecksum(specContent), updatedAt: now };
}

export function recordAdr(
  state: OrchestratorState,
  adrNumber: number,
  now: string,
): OrchestratorState {
  return { ...state, adrIndex: [...state.adrIndex, adrNumber], updatedAt: now };
}

const CONTEXT_GROWTH_LOG_BASE = 2;
const FIRST_MILESTONE_BYTES = 1024;

export function recordContextBytes(
  state: OrchestratorState,
  addedBytes: number,
  now: string,
): { state: OrchestratorState; crossedMilestone: number | null } {
  const previousBytes = state.bytesRead;
  const newBytes = previousBytes + addedBytes;
  const crossedMilestone = milestoneCrossed(previousBytes, newBytes);
  return {
    state: { ...state, bytesRead: newBytes, updatedAt: now },
    crossedMilestone,
  };
}

function milestoneCrossed(previousBytes: number, newBytes: number): number | null {
  const previousIndex = milestoneIndexFor(previousBytes);
  const newIndex = milestoneIndexFor(newBytes);
  if (newIndex > previousIndex) {
    return FIRST_MILESTONE_BYTES * CONTEXT_GROWTH_LOG_BASE ** (newIndex - 1);
  }
  return null;
}

function milestoneIndexFor(totalBytes: number): number {
  if (totalBytes < FIRST_MILESTONE_BYTES) return 0;
  let milestoneIndex = 1;
  let threshold = FIRST_MILESTONE_BYTES;
  while (totalBytes >= threshold * CONTEXT_GROWTH_LOG_BASE) {
    threshold *= CONTEXT_GROWTH_LOG_BASE;
    milestoneIndex++;
  }
  return milestoneIndex;
}
