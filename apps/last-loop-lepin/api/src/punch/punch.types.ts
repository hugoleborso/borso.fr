export type PunchSource = 'admin' | 'self';

export interface LoopPunch {
  readonly id: string;
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly loopIndex: number;
  readonly finishedAt: Date;
  readonly correctedAt: Date | null;
  readonly voidedAt: Date | null;
  readonly source: PunchSource;
  readonly clientLat: number | null;
  readonly clientLng: number | null;
  readonly clientAccuracyM: number | null;
  readonly distanceFromCenterM: number | null;
  readonly userAgent: string | null;
}

export interface ManualDnf {
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly outAtLoop: number;
  readonly reason: 'late' | 'manual';
  readonly decidedAt: Date;
}
