/**
 * What the strip between two setlist rows says.
 *
 * The rule itself lives in `domain/transition.core.ts`; this turns its verdict
 * into rows a reader can render — the member's name and colour, and the
 * instruments they keep across the pair — with the harmonic carriers first and
 * the percussive or vocal ones behind them, which is the order the band reads
 * them in: who can hold the sound, then who can cover.
 *
 * Also indexes the stored transition comments by ordered pair, so a setlist of
 * twenty songs looks its notes up once rather than asking per gap.
 * @Feature transitions
 */

import type { TransitionCarrier, TransitionVerdict } from '@domain/transition.core';

export type TransitionCarrierRole = 'harmonic' | 'support';

export interface TransitionCarrierRow {
  readonly memberId: string;
  readonly memberName: string;
  readonly memberColor: string;
  readonly instrumentNames: readonly string[];
  readonly role: TransitionCarrierRole;
}

export interface TransitionView {
  readonly kind: TransitionVerdict['kind'];
  readonly carriers: readonly TransitionCarrierRow[];
}

interface NameableMember {
  readonly firstName: string;
  readonly color: string;
}

interface NameableInstrument {
  readonly name: string;
}

function buildRows(
  carriers: readonly TransitionCarrier[],
  role: TransitionCarrierRole,
  membersById: Readonly<Record<string, NameableMember>>,
  instrumentsById: Readonly<Record<string, NameableInstrument>>,
): TransitionCarrierRow[] {
  return carriers.flatMap((carrier) => {
    const member = membersById[carrier.memberId];
    if (member === undefined) return [];
    return [
      {
        memberId: carrier.memberId,
        memberName: member.firstName,
        memberColor: member.color,
        instrumentNames: carrier.keptInstrumentIds.flatMap((instrumentId) => {
          const instrument = instrumentsById[instrumentId];
          return instrument === undefined ? [] : [instrument.name];
        }),
        role,
      },
    ];
  });
}

// @FollowsBlueprint core-view-projection
export function buildTransitionView(
  verdict: TransitionVerdict,
  membersById: Readonly<Record<string, NameableMember>>,
  instrumentsById: Readonly<Record<string, NameableInstrument>>,
): TransitionView {
  return {
    kind: verdict.kind,
    carriers: [
      ...buildRows(verdict.harmonicCarriers, 'harmonic', membersById, instrumentsById),
      ...buildRows(verdict.supportCarriers, 'support', membersById, instrumentsById),
    ],
  };
}

export function transitionPairKey(songAId: string, songBId: string): string {
  return `${songAId}::${songBId}`;
}

export interface StoredTransitionComment {
  readonly songAId: string;
  readonly songBId: string;
  readonly comment: string;
}

export function indexTransitionComments(
  comments: readonly StoredTransitionComment[],
): Record<string, string> {
  const byPair: Record<string, string> = {};
  for (const row of comments) {
    byPair[transitionPairKey(row.songAId, row.songBId)] = row.comment;
  }
  return byPair;
}
