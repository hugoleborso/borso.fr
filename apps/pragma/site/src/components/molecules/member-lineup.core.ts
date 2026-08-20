/** @Feature members */

export interface LineupChipMember {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export interface LineupChipInstrument {
  readonly id: string;
  readonly name: string;
}

export interface LineupChip {
  readonly memberId: string;
  readonly memberName: string;
  readonly memberColor: string;
  readonly title: string;
}

export interface LineupChips {
  readonly visible: readonly LineupChip[];
  readonly hiddenCount: number;
  readonly hasHiddenMembers: boolean;
}

const INSTRUMENT_SEPARATOR = ' + ';
const NAME_INSTRUMENT_SEPARATOR = ' — ';

function nameInstruments(
  instrumentIds: readonly string[],
  instruments: readonly LineupChipInstrument[],
): string[] {
  return instrumentIds.flatMap((instrumentId) => {
    const instrument = instruments.find((candidate) => candidate.id === instrumentId);
    return instrument === undefined ? [] : [instrument.name];
  });
}

// @FollowsBlueprint core-projection
export function buildLineupChips(
  lineup: Readonly<Record<string, readonly string[]>>,
  members: readonly LineupChipMember[],
  instruments: readonly LineupChipInstrument[],
  maximumVisible: number,
): LineupChips {
  const chips = Object.entries(lineup).flatMap(([memberId, instrumentIds]) => {
    const member = members.find((candidate) => candidate.id === memberId);
    if (member === undefined) return [];
    const names = nameInstruments(instrumentIds, instruments);
    const title =
      names.length === 0
        ? member.name
        : `${member.name}${NAME_INSTRUMENT_SEPARATOR}${names.join(INSTRUMENT_SEPARATOR)}`;
    return [{ memberId, memberName: member.name, memberColor: member.color, title }];
  });
  const hiddenCount = Math.max(chips.length - maximumVisible, 0);
  return {
    visible: chips.slice(0, maximumVisible),
    hiddenCount,
    hasHiddenMembers: hiddenCount > 0,
  };
}
