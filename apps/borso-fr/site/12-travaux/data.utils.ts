import type { ChallengeKind, ChallengeStatus, Data, Month, ProofType, Year } from './data';

const DONE_WEIGHT = 1;
const PARTIAL_WEIGHT = 0.5;

type Score = { done: number; total: number };

export function monthScore(month: Month): Score {
  let done = 0;
  for (const challenge of month.challenges) {
    if (challenge.status === 'done') done += DONE_WEIGHT;
    else if (challenge.status === 'partial') done += PARTIAL_WEIGHT;
  }
  return { done, total: month.challenges.length };
}

export function yearScore(year: Year): Score {
  let done = 0;
  let total = 0;
  for (const month of year.months) {
    const score = monthScore(month);
    done += score.done;
    total += score.total;
  }
  return { done, total };
}

export function formatScore(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}

const STATUS_LABEL = {
  done: 'Réussi',
  partial: 'Partiel',
  failed: 'Échoué',
  abandoned: 'Abandonné',
  doing: 'En cours',
  todo: 'À venir',
} as const satisfies Record<ChallengeStatus, string>;

export function statusLabel(status: ChallengeStatus): string {
  return STATUS_LABEL[status];
}

type StatusColorRole = 'ink' | 'warn' | 'bad' | 'muted' | 'live' | 'future';

const STATUS_COLOR_ROLE = {
  done: 'ink',
  partial: 'warn',
  failed: 'bad',
  abandoned: 'muted',
  doing: 'live',
  todo: 'future',
} as const satisfies Record<ChallengeStatus, StatusColorRole>;

export function statusColorRole(status: ChallengeStatus): StatusColorRole {
  return STATUS_COLOR_ROLE[status];
}

const KIND_LABEL = {
  daily: 'quotidien',
  count: 'chiffré',
  oneshot: 'ponctuel',
} as const satisfies Record<ChallengeKind, string>;

export function kindLabel(kind: ChallengeKind): string {
  return KIND_LABEL[kind];
}

const FILMSTRIP_BAR_COLOR_FIXED = {
  done: '#7ee29a',
  partial: '#e8b76a',
  failed: '#e89090',
  doing: '#e85a25',
} as const;

const FILMSTRIP_BAR_COLOR_ACTIVE_DEPENDENT = {
  abandoned: { active: '#5a5852', inactive: '#bcb3a0' },
  todo: { active: '#3a3530', inactive: '#d6cdb8' },
} as const;

export function filmstripBarColor(status: ChallengeStatus, active: boolean): string {
  if (status === 'abandoned' || status === 'todo') {
    const palette = FILMSTRIP_BAR_COLOR_ACTIVE_DEPENDENT[status];
    return active ? palette.active : palette.inactive;
  }
  return FILMSTRIP_BAR_COLOR_FIXED[status];
}

const PROOF_ICON = {
  photo: '◳',
  video: '▷',
  link: '↗',
  note: '¶',
  stat: '#',
} as const satisfies Record<ProofType, string>;

export function proofIcon(type: ProofType): string {
  return PROOF_ICON[type];
}

export function countChallenges(
  year: Year,
  predicate: (kind: ChallengeKind, status: ChallengeStatus) => boolean,
): number {
  let matches = 0;
  for (const month of year.months) {
    for (const challenge of month.challenges) {
      if (predicate(challenge.kind, challenge.status)) matches += 1;
    }
  }
  return matches;
}

export function pickDefaultMonth(year: number, today: Date): number {
  if (year === today.getFullYear()) return today.getMonth() + 1;
  return 1;
}

export function pickDefaultYear(availableYears: number[], fallbackYear: number): number {
  return availableYears[availableYears.length - 1] ?? fallbackYear;
}

export function selectYearData(data: Data, year: number): Year {
  const yearData = data.years[year];
  if (!yearData) throw new Error(`No data for year ${year}`);
  return yearData;
}

export function selectFeaturedMonth(year: Year, monthNumber: number): Month {
  const featured = year.months.find((month) => month.m === monthNumber) ?? year.months[0];
  if (!featured) throw new Error('Year has no months');
  return featured;
}
