export type SubAgentVerdictStatus = 'done' | 'question' | 'blocked' | 'failed';

export type VerdictNext =
  | { kind: 'validate' }
  | { kind: 'answer-needed'; question: string; options?: ReadonlyArray<string> }
  | { kind: 'replan'; scope: string }
  | { kind: 'escalate'; reason: string };

export type SubAgentVerdict = {
  status: SubAgentVerdictStatus;
  summary: string;
  next?: VerdictNext;
  artifacts: ReadonlyArray<string>;
};

export type OrchestratorStage =
  | 'spec'
  | 'plan'
  | 'adrs'
  | 'implement'
  | 'validate'
  | 'arbitrate'
  | 'ship'
  | 'escalated';

export type OrchestratorState = {
  runId: string;
  feature: { app: string; slug: string };
  pilotedByTechLead: boolean;
  stage: OrchestratorStage;
  retries: { implement: number; validate: number };
  adrIndex: ReadonlyArray<number>;
  bytesRead: number;
  specChecksum: string | null;
  startedAt: string;
  updatedAt: string;
};

export class OrchestratorSpecMutationAttemptedError extends Error {
  constructor(
    public readonly previousChecksum: string,
    public readonly currentChecksum: string,
  ) {
    super(
      `spec.md mutated mid-run (was ${previousChecksum.slice(0, 8)}, now ${currentChecksum.slice(0, 8)})`,
    );
    this.name = 'OrchestratorSpecMutationAttemptedError';
  }
}
