import { z } from 'zod';

export const CONCERT_MOODS = ['chill', 'gig', 'ticketed'] as const;
export const AVAILABLE_SUPPORTS = ['pa-system', 'lights', 'sound-engineer'] as const;

export type ConcertMood = (typeof CONCERT_MOODS)[number];
export type AvailableSupport = (typeof AVAILABLE_SUPPORTS)[number];

export const concertMoodSchema = z.enum(CONCERT_MOODS);
export const availableSupportSchema = z.array(z.enum(AVAILABLE_SUPPORTS));

/**
 * @Blueprint core-canonical-ordering
 * @BlueprintName Core Canonical Ordering
 * @BlueprintUsage Use for a set a column stores as a list, so two equal sets produce the same bytes and a diff on that column means the answer really changed.
 * @BlueprintDescription Rebuilds the list by filtering the declared order rather than sorting what it was given, which drops duplicates and fixes the order in one pass, and makes the declaration the single place that decides how the set reads. The repository calls it on the way in and on the way out, so a list written by an older client is read in the same order as one written today.
 */
export function orderAvailableSupport(supports: readonly AvailableSupport[]): AvailableSupport[] {
  return AVAILABLE_SUPPORTS.filter((candidate) => supports.includes(candidate));
}

export function resolveConcertMood(stored: string | null): ConcertMood | null {
  const mood = concertMoodSchema.safeParse(stored);
  return mood.success ? mood.data : null;
}
