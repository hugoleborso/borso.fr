import { z } from 'zod';

export const CONCERT_MOODS = ['chill', 'gig', 'ticketed'] as const;
export const AVAILABLE_SUPPORTS = ['pa-system', 'lights', 'sound-engineer'] as const;

export type ConcertMood = (typeof CONCERT_MOODS)[number];
export type AvailableSupport = (typeof AVAILABLE_SUPPORTS)[number];

export const concertMoodSchema = z.enum(CONCERT_MOODS);
export const availableSupportSchema = z.array(z.enum(AVAILABLE_SUPPORTS));

/**
 * @Blueprint core-json-column-round-trip
 * @BlueprintName Core JSON Column Round Trip
 * @BlueprintUsage Use for a list a DSQL table holds as JSON in a TEXT column, so the parse and the serialisation are one pair a test can state.
 * @BlueprintDescription Answers an empty list for a null column, for text that is not JSON and for JSON the schema refuses, because a column written before this feature existed is a bar that lends nothing rather than an error a reader can act on. The serialisation drops duplicates and keeps the declared order, so two equal lists produce the same bytes and a diff on the column means the answer really changed.
 */
export function parseAvailableSupport(stored: string | null): AvailableSupport[] {
  if (stored === null) return [];
  const decoded = z.string().transform(safelyParseJson).safeParse(stored);
  if (!decoded.success) return [];
  const supports = availableSupportSchema.safeParse(decoded.data);
  return supports.success ? orderSupports(supports.data) : [];
}

export function serializeAvailableSupport(supports: readonly AvailableSupport[]): string {
  return JSON.stringify(orderSupports(supports));
}

export function resolveConcertMood(stored: string | null): ConcertMood | null {
  const mood = concertMoodSchema.safeParse(stored);
  return mood.success ? mood.data : null;
}

function orderSupports(supports: readonly AvailableSupport[]): AvailableSupport[] {
  return AVAILABLE_SUPPORTS.filter((candidate) => supports.includes(candidate));
}

function safelyParseJson(raw: string, context: z.RefinementCtx): unknown {
  try {
    const decoded: unknown = JSON.parse(raw);
    return decoded;
  } catch {
    context.addIssue({ code: 'custom', message: 'not json' });
    return z.NEVER;
  }
}
