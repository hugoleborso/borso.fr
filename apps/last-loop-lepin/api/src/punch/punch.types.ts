export interface LoopPunch {
  readonly id: string;
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly loopIndex: number;
  readonly finishedAt: Date;
  readonly correctedAt: Date | null;
  readonly voidedAt: Date | null;
}

export interface ManualDnf {
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly outAtLoop: number;
  readonly reason: 'late' | 'manual';
  readonly decidedAt: Date;
}
