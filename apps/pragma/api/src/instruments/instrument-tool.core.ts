import type { InstrumentWithPlayersRow } from './instruments.repository';
import { type NamedEntity, nameEntity } from './lineup-names.core';

export interface InstrumentToolView {
  readonly id: string;
  readonly name: string;
  readonly family: string;
  readonly players: readonly string[];
  readonly mainFor?: readonly string[];
}

// @FollowsBlueprint core-projection
export function projectInstrumentForTool(
  instrument: InstrumentWithPlayersRow,
  members: readonly NamedEntity[],
): InstrumentToolView {
  const view = {
    id: instrument.id,
    name: instrument.name,
    family: instrument.family,
    players: instrument.players.map((player) => nameEntity(members, player.memberId)),
  };
  const mainFor = instrument.players
    .filter((player) => player.isPrimary)
    .map((player) => nameEntity(members, player.memberId));
  return mainFor.length > 0 ? { ...view, mainFor } : view;
}
