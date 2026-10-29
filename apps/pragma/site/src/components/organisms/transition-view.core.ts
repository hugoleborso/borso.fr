/** @Feature transitions */

import {
  evaluateTransition,
  type TransitionCarrier,
  type TransitionVerdict,
} from '@domain/transition.core';
import {
  instrumentFamilyMap,
  lineupOf,
  type SetlistEditorEntry,
  type SetlistEditorInstrument,
  type SetlistEditorSong,
} from './setlist-editor.utils';

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

export interface TransitionViewsInput {
  readonly entries: readonly SetlistEditorEntry[];
  readonly songsById: Readonly<Record<string, SetlistEditorSong>>;
  readonly instruments: readonly (SetlistEditorInstrument & NameableInstrument)[];
  readonly membersById: Readonly<Record<string, NameableMember>>;
  readonly instrumentsById: Readonly<Record<string, NameableInstrument>>;
}

export function buildTransitionViews(input: TransitionViewsInput): readonly TransitionView[] {
  const families = instrumentFamilyMap(input.instruments);
  return input.entries.flatMap((left, index) => {
    // Stryker disable next-line ArithmeticOperator: equivalent mutant, a transition reads the same both ways, so pairing each entry with the one before yields the same views
    const right = input.entries[index + 1];
    if (right === undefined) return [];
    const verdict = evaluateTransition(
      lineupOf(left, input.songsById),
      lineupOf(right, input.songsById),
      families,
    );
    return [buildTransitionView(verdict, input.membersById, input.instrumentsById)];
  });
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
