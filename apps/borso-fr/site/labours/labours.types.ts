import type { TranslationKey } from '../i18n/i18n.utils';

export type ChallengeStatus = 'done' | 'partial' | 'failed' | 'abandoned' | 'doing' | 'todo';
export type ChallengeKind = 'daily' | 'count' | 'oneshot';
export type ProofType = 'photo' | 'video' | 'link' | 'note' | 'stat';

export interface Proof {
  type: ProofType;
  /** A media path, an external address, or a measured figure, depending on `type`. */
  value: string;
  labelKey?: TranslationKey;
}

export interface Challenge {
  titleKey: TranslationKey;
  kind: ChallengeKind;
  status: ChallengeStatus;
  noteKey?: TranslationKey;
  proofs?: Proof[];
}

export interface Month {
  monthNumber: number;
  nameKey: TranslationKey;
  challenges: Challenge[];
  coverImage?: string;
}

// @FollowsBlueprint domain-types-module
export interface Edition {
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  months: Month[];
}

export interface LaboursData {
  editions: Record<number, Edition>;
}
