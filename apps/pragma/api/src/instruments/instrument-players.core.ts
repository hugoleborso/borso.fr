export interface InstrumentPlayer {
  readonly memberId: string;
  readonly isPrimary: boolean;
}

export interface InstrumentPlayerLink {
  readonly instrumentId: string;
  readonly memberId: string;
  readonly isPrimary: boolean | null;
}

interface Identifiable {
  readonly id: string;
}

interface Orderable {
  readonly position: number;
  readonly name: string;
}

// @FollowsBlueprint core-projection
export function foldPlayersIntoInstruments<Instrument extends Identifiable>(
  instruments: readonly Instrument[],
  links: readonly InstrumentPlayerLink[],
): (Instrument & { players: readonly InstrumentPlayer[] })[] {
  const playersByInstrumentId = new Map<string, InstrumentPlayer[]>();
  for (const link of links) {
    const players = playersByInstrumentId.get(link.instrumentId) ?? [];
    players.push({ memberId: link.memberId, isPrimary: link.isPrimary === true });
    playersByInstrumentId.set(link.instrumentId, players);
  }
  return instruments.map((instrument) => ({
    ...instrument,
    players: playersByInstrumentId.get(instrument.id) ?? [],
  }));
}

export function comparePositionThenName(left: Orderable, right: Orderable): number {
  if (left.position !== right.position) return left.position - right.position;
  return left.name.localeCompare(right.name);
}
