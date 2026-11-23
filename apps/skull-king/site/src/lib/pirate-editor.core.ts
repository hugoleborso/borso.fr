import {
  PIRATE_PART_CHOICES,
  type PirateAvatar,
  type PiratePart,
} from '@domain/pirate-avatar.core';
import type { StepDirection } from './ability-stepper.core';

export const STEPPED_PARTS = [
  'hair',
  'hairColor',
  'facialHair',
  'expression',
  'headwear',
  'eyepatch',
  'scar',
  'earring',
  'mouthpiece',
  'companion',
] as const satisfies readonly Exclude<PiratePart, 'skin'>[];

export type SteppedPart = (typeof STEPPED_PARTS)[number];

// @FollowsBlueprint utils-pure-module
export function stepChoice<Choice>(
  choices: readonly Choice[],
  current: Choice,
  direction: StepDirection,
): Choice {
  const index = choices.indexOf(current);
  const next = (index + direction + choices.length) % choices.length;
  return choices[next] ?? current;
}

export function stepPiratePart(
  avatar: PirateAvatar,
  part: SteppedPart,
  direction: StepDirection,
): PirateAvatar {
  const choices: readonly PirateAvatar[SteppedPart][] = PIRATE_PART_CHOICES[part];
  return { ...avatar, [part]: stepChoice(choices, avatar[part], direction) };
}
