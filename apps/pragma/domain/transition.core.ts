/**
 * Who can carry the gap between two consecutive setlist entries.
 *
 * The rule the band asked for: somebody who still holds a harmonic instrument
 * on both songs can play through the transition, so the gap is covered and
 * that person is named. Whoever keeps a percussive or a vocal instrument
 * across the pair backs them up and is named after them. When nobody keeps a
 * harmonic instrument, every instrument on stage changes hands at once and the
 * transition is risky.
 *
 * A member holding several instruments is compared instrument by instrument: a
 * drummer who also sings and switches to guitar on the next song keeps
 * neither, while a guitarist who picks up a second guitar keeps one.
 *
 * Pure function over lineups and the instrument families. No `now` — the rule
 * is time-independent. No I/O.
 *
 * Output ordering is by member id so two renders of the same pair agree.
 */

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
  /** The instruments this member holds on both songs, sorted. */
  readonly keptInstrumentIds: readonly InstrumentId[];
}

export interface TransitionVerdict {
  readonly kind: 'covered' | 'risky';
  /** Members keeping a harmonic instrument across the pair. */
  readonly harmonicCarriers: readonly TransitionCarrier[];
  /** Members keeping a percussive or vocal instrument, and no harmonic one. */
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
