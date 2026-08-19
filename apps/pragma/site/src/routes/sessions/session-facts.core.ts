/**
 * The short facts that sit on one line beside a session's date. A
 * concert states its capacity, and states how many guests the band
 * expects only once somebody is bringing one; a rehearsal states
 * neither. The caller passes the words, because the rule is which facts
 * are worth the line, not how they read in a given language.
 * @Feature sessions
 */

export interface SessionFactsInput {
  readonly isConcert: boolean;
  readonly capacity: number | null;
  readonly guestCount: number;
  readonly capacityLabel: string;
  readonly guestsLabel: string;
}

// @FollowsBlueprint core-projection
export function selectSessionFacts(input: SessionFactsInput): string[] {
  if (!input.isConcert) return [];
  const facts: string[] = [];
  if (input.capacity !== null) facts.push(`${input.capacityLabel} ${String(input.capacity)}`);
  if (input.guestCount > 0) facts.push(`${String(input.guestCount)} ${input.guestsLabel}`);
  return facts;
}
