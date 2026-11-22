import type { PlayerColor, PlayerIcon } from '@domain/player-mark.core';
import type { BonusKind } from '@domain/scoring.core';
import { DISPLAYED_ERROR_CODES } from './error-codes.core';

export const ICON_KEYS = {
  skull: 'marks.icons.skull',
  parrot: 'marks.icons.parrot',
  anchor: 'marks.icons.anchor',
  crown: 'marks.icons.crown',
  wheel: 'marks.icons.wheel',
  kraken: 'marks.icons.kraken',
  chest: 'marks.icons.chest',
  compass: 'marks.icons.compass',
  swords: 'marks.icons.swords',
  hook: 'marks.icons.hook',
  bottle: 'marks.icons.bottle',
  spyglass: 'marks.icons.spyglass',
} as const satisfies Record<PlayerIcon, string>;

export const COLOR_KEYS = {
  gold: 'marks.colors.gold',
  lagoon: 'marks.colors.lagoon',
  coral: 'marks.colors.coral',
  amethyst: 'marks.colors.amethyst',
  sky: 'marks.colors.sky',
  rose: 'marks.colors.rose',
  lime: 'marks.colors.lime',
  sand: 'marks.colors.sand',
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

export type ErrorTranslationKey = (typeof ERROR_KEYS)[keyof typeof ERROR_KEYS];

// @FollowsBlueprint core-label-key
export function selectErrorKey(code: string): ErrorTranslationKey {
  const known = DISPLAYED_ERROR_CODES.find((candidate) => candidate === code);
  return ERROR_KEYS[known ?? 'unexpected-failure'];
}
