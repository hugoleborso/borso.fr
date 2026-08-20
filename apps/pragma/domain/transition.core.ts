import type { InstrumentFamily } from './instrument.core';
import {
  type InstrumentId,
  instrumentedMembers,
  instrumentsHeldBy,
  type Lineup,
  type MemberId,
} from './lineup.core';

export type InstrumentFamilyMap = Readonly<
  Record<InstrumentId, { readonly family: InstrumentFamily }>
>;

export interface TransitionCarrier {
  readonly memberId: MemberId;
  readonly keptInstrumentIds: readonly InstrumentId[];
}

export interface TransitionVerdict {
  readonly kind: 'covered' | 'risky';
  readonly harmonicCarriers: readonly TransitionCarrier[];
  readonly supportCarriers: readonly TransitionCarrier[];
}

const SUPPORTING_FAMILIES: readonly InstrumentFamily[] = ['percussive', 'vocal'];

function keptInstruments(
  lineupA: Lineup,
  lineupB: Lineup,
  memberId: MemberId,
): readonly InstrumentId[] {
  const heldOnB = new Set(instrumentsHeldBy(lineupB, memberId));
  return instrumentsHeldBy(lineupA, memberId)
    .filter((instrumentId) => heldOnB.has(instrumentId))
    .toSorted();
}

function withinFamilies(
  instrumentIds: readonly InstrumentId[],
  instruments: InstrumentFamilyMap,
  families: readonly InstrumentFamily[],
): readonly InstrumentId[] {
  return instrumentIds.filter((instrumentId) =>
    families.some((family) => instruments[instrumentId]?.family === family),
  );
}

// @FollowsBlueprint core-decision
export function evaluateTransition(
  lineupA: Lineup,
  lineupB: Lineup,
  instruments: InstrumentFamilyMap,
): TransitionVerdict {
  const harmonicCarriers: TransitionCarrier[] = [];
  const supportCarriers: TransitionCarrier[] = [];
  const memberIds = instrumentedMembers(lineupA)
    .map(([memberId]) => memberId)
    .toSorted();

  for (const memberId of memberIds) {
    const kept = keptInstruments(lineupA, lineupB, memberId);
    const harmonic = withinFamilies(kept, instruments, ['harmonic']);
    if (harmonic.length > 0) {
      harmonicCarriers.push({ memberId, keptInstrumentIds: harmonic });
      continue;
    }
    const supporting = withinFamilies(kept, instruments, SUPPORTING_FAMILIES);
    if (supporting.length > 0) {
      supportCarriers.push({ memberId, keptInstrumentIds: supporting });
    }
  }

  return {
    kind: harmonicCarriers.length > 0 ? 'covered' : 'risky',
    harmonicCarriers,
    supportCarriers,
  };
}
