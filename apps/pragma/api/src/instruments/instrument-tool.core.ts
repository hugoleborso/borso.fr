import type { InstrumentWithPlayersRow } from './instruments.repository';
import { type NamedEntity, nameEntity } from './lineup-names.core';

export interface InstrumentToolView {
  readonly id: string;
  readonly name: string;
  readonly family: string;
  readonly players: readonly string[];
}

// @FollowsBlueprint core-projection
export function projectInstrumentForTool(
  instrument: InstrumentWithPlayersRow,
  members: readonly NamedEntity[],
): InstrumentToolView {
  return {
    id: instrument.id,
    name: instrument.name,
    family: instrument.family,
    players: instrument.players.map((player) => nameEntity(members, player.memberId)),
  };
}
