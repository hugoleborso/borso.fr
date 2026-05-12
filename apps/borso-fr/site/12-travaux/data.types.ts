export type ChallengeStatus = 'done' | 'partial' | 'failed' | 'abandoned' | 'doing' | 'todo';
export type ChallengeKind = 'daily' | 'count' | 'oneshot';
export type ProofType = 'photo' | 'video' | 'link' | 'note' | 'stat';

export type Proof = { type: ProofType; v: string; label?: string };

export type Challenge = {
  t: string;
  kind: ChallengeKind;
  status: ChallengeStatus;
  note?: string;
  proofs?: Proof[];
};

export type Month = { m: number; name: string; challenges: Challenge[]; cover?: string };
export type Year = { title: string; subtitle: string; months: Month[] };
export type Data = { years: Record<number, Year> };
