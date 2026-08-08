/**
 * The default lineup of a song, read as rows a reader can render.
 *
 * The song stores a member id against an instrument id, and the two cards in
 * the detail page's sidebar both need the same resolution: who the member is,
 * what they play, and how well they play it. Resolving once here keeps both
 * cards free of `.find()` chains and makes the "a member who left the band is
 * dropped" rule something a test can state.
 */

export interface LineupMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export interface LineupInstrument {
  readonly id: string;
  readonly name: string;
}

export interface SongLineupRow {
  readonly memberId: string;
  readonly memberName: string;
  readonly memberColor: string;
  readonly instrumentName: string | null;
  readonly masteryScore: number | null;
}

export const MASTERY_BAR_COUNT = 10;

/**
 * Whether the nth bar of a ten-bar mastery meter is filled. An unknown score
 * fills nothing, which is how the meter shows "never rated".
 */
export function isMasteryBarFilled(masteryScore: number | null, barIndex: number): boolean {
  return masteryScore !== null && barIndex < masteryScore;
}

export function buildMasteryKey(memberId: string, instrumentId: string): string {
  return `${memberId}::${instrumentId}`;
}

export function buildSongLineupRows(
  defaultLineup: Readonly<Record<string, string | null>>,
  members: readonly LineupMember[],
  instruments: readonly LineupInstrument[],
  masteryByMemberInstrument: ReadonlyMap<string, number>,
): SongLineupRow[] {
  const rows: SongLineupRow[] = [];
  for (const [memberId, instrumentId] of Object.entries(defaultLineup)) {
    const member = members.find((candidate) => candidate.id === memberId);
    if (member === undefined) continue;
    const instrument = instruments.find((candidate) => candidate.id === instrumentId);
    rows.push({
      memberId,
      memberName: member.firstName,
      memberColor: member.color,
      instrumentName: instrument?.name ?? null,
      masteryScore:
        instrumentId === null
          ? null
          : (masteryByMemberInstrument.get(buildMasteryKey(memberId, instrumentId)) ?? null),
    });
  }
  return rows;
}
