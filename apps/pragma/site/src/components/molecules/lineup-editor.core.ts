/**
 * Translations between a lineup record (`memberId -> the instruments they
 * hold`) and the form values the lineup editor holds.
 *
 * A member holding nothing sits the song out, and a selection where nobody
 * holds anything collapses to `null`, because the API treats a non-null
 * lineup as "this entry overrides the song default" and an empty object would
 * claim an override that says nothing.
 * @Feature members
 */

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

/** Adding an instrument the member does not hold, or dropping one they do. */
export function toggleInstrumentHeld(
  instrumentIds: readonly string[],
  instrumentId: string,
): string[] {
  if (instrumentIds.includes(instrumentId)) {
    return instrumentIds.filter((current) => current !== instrumentId);
  }
  return [...instrumentIds, instrumentId];
}

/**
 * The lineup as the API takes it. The editor holds readonly lists, and the
 * request body is a mutable record, so the copy happens once here rather than
 * at each of the two call sites.
 */
export function toLineupPayload(lineup: LineupRecord | null): Record<string, string[]> {
  const body: Record<string, string[]> = {};
  for (const [memberId, instrumentIds] of Object.entries(lineup ?? {})) {
    body[memberId] = [...instrumentIds];
  }
  return body;
}
