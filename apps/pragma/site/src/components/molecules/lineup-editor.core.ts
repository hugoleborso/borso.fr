/**
 * Translations between a lineup record (`memberId -> instrumentId or
 * null`) and the flat string form the lineup editor holds.
 *
 * A selection where nobody plays anything collapses to `null`, because
 * the API treats a non-null lineup as "this entry overrides the song
 * default" and an empty object would claim an override that says
 * nothing.
 */

export type LineupRecord = Readonly<Record<string, string | null>>;

export interface LineupEditorMember {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export const NOT_PLAYING_OPTION_VALUE = '';

export type LineupFormValues = Record<string, string>;

export function lineupToFormValues(
  lineup: LineupRecord,
  members: readonly LineupEditorMember[],
): LineupFormValues {
  const values: LineupFormValues = {};
  for (const member of members) {
    values[member.id] = lineup[member.id] ?? NOT_PLAYING_OPTION_VALUE;
  }
  return values;
}

export function formValuesToLineup(values: LineupFormValues): LineupRecord | null {
  let hasAnyAssignment = false;
  const lineup: Record<string, string | null> = {};
  for (const [memberId, instrumentId] of Object.entries(values)) {
    if (instrumentId === NOT_PLAYING_OPTION_VALUE) continue;
    lineup[memberId] = instrumentId;
    hasAnyAssignment = true;
  }
  return hasAnyAssignment ? lineup : null;
}
