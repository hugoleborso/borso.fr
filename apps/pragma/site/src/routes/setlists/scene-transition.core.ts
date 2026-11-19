/** @Feature setlists */

import type { InstrumentFamily, InstrumentIcon } from '@domain/instrument.core';
import { instrumentsHeldBy, type Lineup } from '@domain/lineup.core';
import { evaluateTransition, type InstrumentFamilyMap } from '@domain/transition.core';

export interface SceneTransitionMemberInput {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export interface SceneTransitionInstrumentInput {
  readonly id: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
  readonly family: InstrumentFamily;
}

export interface SceneTransitionInput {
  readonly currentLineup: Lineup;
  readonly nextLineup: Lineup;
  readonly members: readonly SceneTransitionMemberInput[];
  readonly instruments: readonly SceneTransitionInstrumentInput[];
}

export interface SceneTransitionPart {
  readonly instrumentId: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
}

export type SceneTransitionMove = 'keeps' | 'changes' | 'joins';

export interface SceneTransitionMember {
  readonly memberId: string;
  readonly firstName: string;
  readonly color: string;
  readonly move: SceneTransitionMove;
  readonly hasArrow: boolean;
  readonly putDown: readonly SceneTransitionPart[];
  readonly pickUp: readonly SceneTransitionPart[];
}

export interface SceneTransition {
  readonly isRisky: boolean;
  readonly members: readonly SceneTransitionMember[];
}

const NOTHING_HELD: readonly SceneTransitionPart[] = [];

function partsOf(
  instrumentIds: readonly string[],
  instruments: readonly SceneTransitionInstrumentInput[],
): readonly SceneTransitionPart[] {
  return instruments
    .filter((instrument) => instrumentIds.includes(instrument.id))
    .map((instrument) => ({
      instrumentId: instrument.id,
      name: instrument.name,
      icon: instrument.icon,
    }));
}

function isSameSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id) => right.includes(id));
}

function selectMove(heldNow: readonly string[], heldNext: readonly string[]): SceneTransitionMove {
  if (heldNow.length === 0) return 'joins';
  return isSameSet(heldNow, heldNext) ? 'keeps' : 'changes';
}

function familyMapOf(instruments: readonly SceneTransitionInstrumentInput[]): InstrumentFamilyMap {
  return Object.fromEntries(
    instruments.map((instrument) => [instrument.id, { family: instrument.family }]),
  );
}

// @FollowsBlueprint core-decision
export function buildSceneTransition(input: SceneTransitionInput): SceneTransition {
  const verdict = evaluateTransition(
    input.currentLineup,
    input.nextLineup,
    familyMapOf(input.instruments),
  );
  const members = input.members.flatMap((member) => {
    const heldNext = instrumentsHeldBy(input.nextLineup, member.id);
    if (heldNext.length === 0) return [];
    const heldNow = instrumentsHeldBy(input.currentLineup, member.id);
    const move = selectMove(heldNow, heldNext);
    return [
      {
        memberId: member.id,
        firstName: member.firstName,
        color: member.color,
        move,
        hasArrow: move !== 'keeps',
        putDown: move === 'changes' ? partsOf(heldNow, input.instruments) : NOTHING_HELD,
        pickUp: partsOf(heldNext, input.instruments),
      },
    ];
  });
  return { isRisky: verdict.kind === 'risky', members };
}

const ARROW = '→';

function namesOf(parts: readonly SceneTransitionPart[]): string {
  return parts.map((part) => part.name).join(', ');
}

const MOVE_DESCRIPTION: Readonly<
  Record<SceneTransitionMove, (member: SceneTransitionMember) => string>
> = {
  keeps: (member) => namesOf(member.pickUp),
  joins: (member) => `${ARROW} ${namesOf(member.pickUp)}`,
  changes: (member) => `${namesOf(member.putDown)} ${ARROW} ${namesOf(member.pickUp)}`,
};

export function describeSceneTransitionMember(member: SceneTransitionMember): string {
  return `${member.firstName}: ${MOVE_DESCRIPTION[member.move](member)}`;
}
