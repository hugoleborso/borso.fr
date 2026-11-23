import type { PiratePart } from '@domain/pirate-avatar.core';
import type { PlayerColor } from '@domain/player-mark.core';
import type { BonusKind } from '@domain/scoring.core';
import { DISPLAYED_ERROR_CODES } from './error-codes.core';

export const PIRATE_PART_KEYS = {
  skin: 'pirate.parts.skin',
  hair: 'pirate.parts.hair',
  hairColor: 'pirate.parts.hairColor',
  facialHair: 'pirate.parts.facialHair',
  expression: 'pirate.parts.expression',
  headwear: 'pirate.parts.headwear',
  eyepatch: 'pirate.parts.eyepatch',
  scar: 'pirate.parts.scar',
  earring: 'pirate.parts.earring',
  mouthpiece: 'pirate.parts.mouthpiece',
  companion: 'pirate.parts.companion',
} as const satisfies Record<PiratePart, string>;

export const COLOR_KEYS = {
  gold: 'marks.colors.gold',
  sky: 'marks.colors.sky',
  magenta: 'marks.colors.magenta',
  ice: 'marks.colors.ice',
  amethyst: 'marks.colors.amethyst',
  sand: 'marks.colors.sand',
  indigo: 'marks.colors.indigo',
  slate: 'marks.colors.slate',
} as const satisfies Record<PlayerColor, string>;

export const BONUS_KEYS = {
  standardFourteen: 'cards.standardFourteen',
  blackFourteen: 'cards.blackFourteen',
  mermaidByPirate: 'cards.mermaidByPirate',
  pirateBySkullKing: 'cards.pirateBySkullKing',
  skullKingByMermaid: 'cards.skullKingByMermaid',
  loot: 'cards.loot',
} as const satisfies Record<BonusKind, string>;

const ERROR_KEYS = {
  'game-not-found': 'errors.game-not-found',
  'player-not-found': 'errors.player-not-found',
  'round-not-played': 'errors.round-not-played',
  'value-out-of-range': 'errors.value-out-of-range',
  'bids-missing': 'errors.bids-missing',
  'tricks-unbalanced': 'errors.tricks-unbalanced',
  'seat-taken': 'errors.seat-taken',
  'session-required': 'errors.session-required',
  'passkey-not-verified': 'errors.passkey-not-verified',
  'unexpected-failure': 'errors.unexpected-failure',
} as const;

const GAME_NOT_CREATED_KEY = 'errors.game-not-created';

export type ErrorTranslationKey =
  | (typeof ERROR_KEYS)[keyof typeof ERROR_KEYS]
  | typeof GAME_NOT_CREATED_KEY;

// @FollowsBlueprint core-label-key
export function selectErrorKey(code: string): ErrorTranslationKey {
  const known = DISPLAYED_ERROR_CODES.find((candidate) => candidate === code);
  return ERROR_KEYS[known ?? 'unexpected-failure'];
}

export function selectCreateErrorKey(code: string): ErrorTranslationKey {
  return code === 'value-out-of-range' ? GAME_NOT_CREATED_KEY : selectErrorKey(code);
}
