import { z } from 'zod';
import { parseJsonOrNull } from '../helpers/json/json.core';

export interface LatePage {
  readonly slug: string;
  readonly title: string;
  readonly kind: string;
  readonly closeness: number | null;
  readonly summarizedOn: string;
  readonly factCount: number;
  readonly containedFactCount: number;
  readonly lateness: number;
}

export interface Freshness {
  readonly generatedAt: string | null;
  readonly lateCount: number;
  readonly pages: readonly LatePage[];
}

const TITLE_FIELD = 'titre';

const freshnessFileSchema = z.object({
  genere: z.string().nullish(),
  en_retard: z.number().int().nonnegative(),
  pages: z.array(z.unknown()),
});

const latePageSchema = z.object({
  slug: z.string().min(1),
  [TITLE_FIELD]: z.string().min(1),
  type: z.string(),
  proximite: z.number().nullish(),
  resume_le: z.iso.date(),
  faits: z.number(),
  faits_englobes: z.number(),
  retard: z.number(),
});

const NO_FRESHNESS: Freshness = { generatedAt: null, lateCount: 0, pages: [] };

function readLatePage(entry: unknown): LatePage | null {
  const pageEntry = latePageSchema.safeParse(entry);
  if (!pageEntry.success) return null;
  const { slug, type, proximite, resume_le, faits, faits_englobes, retard } = pageEntry.data;
  return {
    slug,
    title: pageEntry.data[TITLE_FIELD],
    kind: type,
    closeness: proximite ?? null,
    summarizedOn: resume_le,
    factCount: faits,
    containedFactCount: faits_englobes,
    lateness: retard,
  };
}

// @FollowsBlueprint core-parse-untrusted
export function parseFreshness(raw: string | null): Freshness {
  // Stryker disable next-line ConditionalExpression: equivalent mutant, a missing state parses to null and fails the schema below exactly like this early answer.
  if (raw === null) return NO_FRESHNESS;
  const freshnessFile = freshnessFileSchema.safeParse(parseJsonOrNull(raw));
  if (!freshnessFile.success) return NO_FRESHNESS;
  return {
    generatedAt: freshnessFile.data.genere ?? null,
    lateCount: freshnessFile.data.en_retard,
    pages: freshnessFile.data.pages
      .map((entry) => readLatePage(entry))
      .filter((page) => page !== null),
  };
}
