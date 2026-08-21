import type { TranslationKey } from '../i18n/i18n.utils';
import type {
  Challenge,
  ChallengeKind,
  ChallengeStatus,
  Edition,
  LaboursData,
  Month,
  Proof,
} from './labours.types';

const DONE_WEIGHT = 1;
const PARTIAL_WEIGHT = 0.5;
const FIRST_MONTH_NUMBER = 1;
const MONTH_NUMBER_OFFSET_FROM_INDEX = 1;
const MIDDLE_DOT_SEPARATOR = ' · ';
const SINGLE_DECIMAL = 1;
const FRENCH_LOCALE = 'fr-FR';
const MINIMUM_PHOTOS_FOR_IMPLICIT_COVER = 2;
const ONE_COVER = 1;
const MONTH_NUMBER_DIGITS = 2;
const MONTH_NUMBER_PAD = '0';
const NO_LABEL = null;

export interface Score {
  completed: number;
  total: number;
}

const WEIGHT_BY_STATUS: Readonly<Partial<Record<ChallengeStatus, number>>> = {
  done: DONE_WEIGHT,
  partial: PARTIAL_WEIGHT,
};

export function deriveMonthScore(month: Month): Score {
  let completed = 0;
  for (const challenge of month.challenges) {
    completed += WEIGHT_BY_STATUS[challenge.status] ?? 0;
  }
  return { completed, total: month.challenges.length };
}

export function deriveEditionScore(edition: Edition): Score {
  let completed = 0;
  let total = 0;
  for (const month of edition.months) {
    const monthScore = deriveMonthScore(month);
    completed += monthScore.completed;
    total += monthScore.total;
  }
  return { completed, total };
}

export function selectCompletionRatio(score: Score): number {
  if (score.total === 0) return 0;
  return score.completed / score.total;
}

export function formatScore(value: number): string {
  return Number(value.toFixed(SINGLE_DECIMAL)).toLocaleString(FRENCH_LOCALE);
}

function countChallenges(edition: Edition, isCounted: (challenge: Challenge) => boolean): number {
  let matches = 0;
  for (const month of edition.months) {
    for (const challenge of month.challenges) {
      matches += Number(isCounted(challenge));
    }
  }
  return matches;
}

export function countChallengesOfKind(edition: Edition, kind: ChallengeKind): number {
  return countChallenges(edition, (challenge) => challenge.kind === kind);
}

const UNFINISHED_STATUSES: ReadonlySet<ChallengeStatus> = new Set(['todo', 'doing']);

export function countUnfinishedChallenges(edition: Edition): number {
  return countChallenges(edition, (challenge) => UNFINISHED_STATUSES.has(challenge.status));
}

export function selectDefaultMonthNumber(year: number, today: Date): number {
  if (year === today.getFullYear()) return today.getMonth() + MONTH_NUMBER_OFFSET_FROM_INDEX;
  return FIRST_MONTH_NUMBER;
}

export function selectCurrentMonthNumber(year: number, today: Date): number | null {
  if (year !== today.getFullYear()) return null;
  return today.getMonth() + MONTH_NUMBER_OFFSET_FROM_INDEX;
}

export function listAvailableYears(data: LaboursData): readonly number[] {
  return Object.keys(data.editions).map(Number);
}

export function selectDefaultYear(availableYears: readonly number[], fallbackYear: number): number {
  return availableYears.at(-1) ?? fallbackYear;
}

export function selectEdition(data: LaboursData, year: number): Edition {
  const edition = data.editions[year];
  if (edition === undefined) throw new Error(`No twelve-labours edition for year ${year}`);
  return edition;
}

export function formatMonthNumber(monthNumber: number): string {
  return String(monthNumber).padStart(MONTH_NUMBER_DIGITS, MONTH_NUMBER_PAD);
}

export function selectFeaturedMonth(edition: Edition, monthNumber: number): Month {
  const featured =
    edition.months.find((month) => month.monthNumber === monthNumber) ?? edition.months[0];
  if (featured === undefined) throw new Error('The edition carries no months');
  return featured;
}

export function listMonthCoverImages(month: Month): readonly string[] {
  if (month.coverImage !== undefined) return [month.coverImage];
  const photos = month.challenges.flatMap(
    (challenge) => challenge.proofs?.filter((proof) => proof.type === 'photo') ?? [],
  );
  if (photos.length < MINIMUM_PHOTOS_FOR_IMPLICIT_COVER) return [];
  return photos.slice(0, ONE_COVER).map((photo) => photo.value);
}

export function listChallengeNoteKeys(challenge: Challenge): readonly TranslationKey[] {
  if (challenge.noteKey === undefined) return [];
  return [challenge.noteKey];
}

export function listProofLabelKeys(proof: Proof): readonly TranslationKey[] {
  if (proof.labelKey === undefined) return [];
  return [proof.labelKey];
}

export type ProofLabelTranslator = (key: TranslationKey) => string;

export function selectProofLabel(proof: Proof, translate: ProofLabelTranslator): string | null {
  return listProofLabelKeys(proof).map((key) => translate(key))[0] ?? NO_LABEL;
}

export type ProofSectionKind = 'media' | 'chip';

export interface ProofSection {
  kind: ProofSectionKind;
  proofs: readonly Proof[];
}

const MEDIA_PROOF_TYPES: ReadonlySet<Proof['type']> = new Set(['photo', 'video']);

export function isMediaProof(proof: Proof): boolean {
  return MEDIA_PROOF_TYPES.has(proof.type);
}

// @FollowsBlueprint core-view-intent
export function listProofSections(challenge: Challenge): readonly ProofSection[] {
  const proofs = challenge.proofs ?? [];
  const candidates: readonly ProofSection[] = [
    { kind: 'media', proofs: proofs.filter((proof) => isMediaProof(proof)) },
    { kind: 'chip', proofs: proofs.filter((proof) => !isMediaProof(proof)) },
  ];
  return candidates.filter((section) => section.proofs.length > 0);
}

export function buildProofChipText(proof: Proof, label: string | null): string {
  if (proof.type === 'link') return label ?? proof.value;
  if (proof.type === 'stat' && label !== null)
    return `${label}${MIDDLE_DOT_SEPARATOR}${proof.value}`;
  return proof.value;
}

export function buildFilmstripSummary(
  challengeTitles: readonly string[],
  visibleTitleCount: number,
): string {
  const visible = challengeTitles.slice(0, visibleTitleCount).join(MIDDLE_DOT_SEPARATOR);
  const hiddenCount = challengeTitles.length - visibleTitleCount;
  if (hiddenCount <= 0) return visible;
  return `${visible} +${hiddenCount}`;
}

export function buildProofKey(challenge: Challenge, proof: Proof): string {
  return `${challenge.titleKey}::${proof.type}::${proof.value}`;
}
