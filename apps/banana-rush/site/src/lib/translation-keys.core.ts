import { MONKEY_AVATARS, type MonkeyAvatar } from '@domain/monkey.core';
import { GAME_ERROR_CODES } from './error-codes.core';

export const MONKEY_NAME_KEYS = {
  chimp: 'monkeys.chimp',
  gibbon: 'monkeys.gibbon',
  macaque: 'monkeys.macaque',
  mandrill: 'monkeys.mandrill',
  marmoset: 'monkeys.marmoset',
  tamarin: 'monkeys.tamarin',
  capuchin: 'monkeys.capuchin',
  lemur: 'monkeys.lemur',
} as const;

export const RULE_KEYS = [
  'rules.stashAndCrate',
  'rules.secretNumber',
  'rules.highestWins',
  'rules.tariff',
  'rules.bust',
  'rules.tie',
  'rules.crateRefill',
  'rules.comeback',
] as const;

export const LANGUAGE_KEYS = { fr: 'language.fr', en: 'language.en' } as const;

export const ERROR_KEYS = {
  'game-not-found': 'errors.game-not-found',
  'game-full': 'errors.game-full',
  'already-started': 'errors.already-started',
  'avatar-taken': 'errors.avatar-taken',
  'not-in-lobby': 'errors.not-in-lobby',
  'not-enough-players': 'errors.not-enough-players',
  'not-host': 'errors.not-host',
  'not-a-player': 'errors.not-a-player',
  'not-playing': 'errors.not-playing',
  'already-bid': 'errors.already-bid',
  'round-still-open': 'errors.round-still-open',
  'unexpected-failure': 'errors.unexpected-failure',
} as const;

export type ErrorTranslationKey = (typeof ERROR_KEYS)[keyof typeof ERROR_KEYS];

// @FollowsBlueprint core-label-key
export function selectErrorKey(code: string): ErrorTranslationKey {
  const known = GAME_ERROR_CODES.find((candidate) => candidate === code);
  return ERROR_KEYS[known ?? 'unexpected-failure'];
}

export function selectMonkeyKey(avatar: string): (typeof MONKEY_NAME_KEYS)[MonkeyAvatar] {
  const known = MONKEY_AVATARS.find((candidate) => candidate === avatar);
  return MONKEY_NAME_KEYS[known ?? 'chimp'];
}
