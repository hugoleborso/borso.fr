/** @Feature setlists */

import type { InstrumentFamily, InstrumentIcon } from '@domain/instrument.core';
import { instrumentsHeldBy, type Lineup } from '@domain/lineup.core';
import { evaluateTransition } from '@domain/transition.core';
import { instrumentFamilyMap } from '../../components/organisms/setlist-editor.utils';

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
  readonly kept: readonly SceneTransitionPart[];
  readonly putDown: readonly SceneTransitionPart[];
  readonly pickUp: readonly SceneTransitionPart[];
}

export interface SceneTransition {
  readonly isRisky: boolean;
  readonly members: readonly SceneTransitionMember[];
}

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

function selectMove(heldNow: readonly string[], heldNext: readonly string[]): SceneTransitionMove {
  if (heldNow.length === 0) return 'joins';
  const isSameSet =
    heldNow.length === heldNext.length && heldNow.every((id) => heldNext.includes(id));
  return isSameSet ? 'keeps' : 'changes';
}

function without(instrumentIds: readonly string[], removed: readonly string[]): readonly string[] {
  return instrumentIds.filter((id) => !removed.includes(id));
}

function within(instrumentIds: readonly string[], kept: readonly string[]): readonly string[] {
  return instrumentIds.filter((id) => kept.includes(id));
}

// @FollowsBlueprint core-decision
export function buildSceneTransition(input: SceneTransitionInput): SceneTransition {
  const verdict = evaluateTransition(
    input.currentLineup,
    input.nextLineup,
    instrumentFamilyMap(input.instruments),
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
        kept: partsOf(within(heldNext, heldNow), input.instruments),
        putDown: partsOf(without(heldNow, heldNext), input.instruments),
        pickUp: partsOf(without(heldNext, heldNow), input.instruments),
      },
    ];
  });
  return { isRisky: verdict.kind === 'risky', members };
}

const ARROW = '→';

function namesOf(parts: readonly SceneTransitionPart[]): string {
  return parts.map((part) => part.name).join(', ');
}

export function describeSceneTransitionLineup(member: SceneTransitionMember): string {
  const kept = namesOf(member.kept);
  if (!member.hasArrow) return kept;
  const move = `${namesOf(member.putDown)} ${ARROW} ${namesOf(member.pickUp)}`.trim();
  return kept === '' ? move : `${kept} (${move})`;
}
