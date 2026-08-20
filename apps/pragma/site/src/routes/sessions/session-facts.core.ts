/** @Feature sessions */

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
