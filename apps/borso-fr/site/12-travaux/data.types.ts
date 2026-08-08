export type ChallengeStatus = 'done' | 'partial' | 'failed' | 'abandoned' | 'doing' | 'todo';
export type ChallengeKind = 'daily' | 'count' | 'oneshot';
export type ProofType = 'photo' | 'video' | 'link' | 'note' | 'stat';

export interface Proof {
  type: ProofType;
  v: string;
  label?: string;
}

export interface Challenge {
  t: string;
  kind: ChallengeKind;
  status: ChallengeStatus;
  note?: string;
  proofs?: Proof[];
}

export interface Month {
  m: number;
  name: string;
  challenges: Challenge[];
  cover?: string;
}
export interface Year {
  title: string;
  subtitle: string;
  months: Month[];
}
export interface Data {
  years: Record<number, Year>;
}
