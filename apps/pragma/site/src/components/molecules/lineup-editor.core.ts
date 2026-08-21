/** @Feature members */

export type LineupRecord = Readonly<Record<string, readonly string[]>>;

export interface LineupEditorMember {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export type LineupFormValues = Record<string, string[]>;

// @FollowsBlueprint core-form-schema
export function lineupToFormValues(
  lineup: LineupRecord,
  members: readonly LineupEditorMember[],
): LineupFormValues {
  const values: LineupFormValues = {};
  for (const member of members) {
    values[member.id] = [...(lineup[member.id] ?? [])];
  }
  return values;
}

export function formValuesToLineup(values: LineupFormValues): LineupRecord | null {
  let hasAnyAssignment = false;
  const lineup: Record<string, readonly string[]> = {};
  for (const [memberId, instrumentIds] of Object.entries(values)) {
    lineup[memberId] = instrumentIds;
    if (instrumentIds.length > 0) hasAnyAssignment = true;
  }
  return hasAnyAssignment ? lineup : null;
}

export function toggleInstrumentHeld(
  instrumentIds: readonly string[],
  instrumentId: string,
): string[] {
  if (instrumentIds.includes(instrumentId)) {
    return instrumentIds.filter((current) => current !== instrumentId);
  }
  return [...instrumentIds, instrumentId];
}

export function toLineupPayload(lineup: LineupRecord | null): Record<string, string[]> {
  const body: Record<string, string[]> = {};
  for (const [memberId, instrumentIds] of Object.entries(lineup ?? {})) {
    body[memberId] = [...instrumentIds];
  }
  return body;
}
