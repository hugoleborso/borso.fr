/** @Feature studies */

export interface ScoreChange {
  readonly memberId: string;
  readonly instrumentId: string;
  readonly score: number;
}

export interface ProgressSeries {
  readonly key: string;
  readonly memberName: string;
  readonly memberColor: string;
  readonly instrumentName: string;
  readonly scores: readonly number[];
}

interface NamedMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

interface NamedInstrument {
  readonly id: string;
  readonly name: string;
}

// @FollowsBlueprint core-view-projection
export function groupScoreChangesIntoSeries(
  changes: readonly ScoreChange[],
  members: readonly NamedMember[],
  instruments: readonly NamedInstrument[],
): ProgressSeries[] {
  const seriesByKey = new Map<string, ProgressSeries>();
  for (const change of changes) {
    const member = members.find((candidate) => candidate.id === change.memberId);
    if (member === undefined) continue;
    const key = `${change.memberId}:${change.instrumentId}`;
    const existing = seriesByKey.get(key);
    seriesByKey.set(key, {
      key,
      memberName: member.firstName,
      memberColor: member.color,
      instrumentName:
        instruments.find((instrument) => instrument.id === change.instrumentId)?.name ?? '',
      scores: [...(existing?.scores ?? []), change.score],
    });
  }
  return [...seriesByKey.values()];
}
