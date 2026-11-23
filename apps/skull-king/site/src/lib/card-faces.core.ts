import type { BonusKind } from '@domain/scoring.core';

// @FollowsBlueprint component-lookup-table
export const BONUS_CARD_IMAGES: Readonly<Record<BonusKind, string>> = {
  standardFourteen: '/cards/standard-fourteen.jpg',
  blackFourteen: '/cards/black-fourteen.jpg',
  mermaidByPirate: '/cards/mermaid.jpg',
  pirateBySkullKing: '/cards/pirate.jpg',
  skullKingByMermaid: '/cards/skull-king.jpg',
  loot: '/cards/loot.jpg',
};

export const KRAKEN_CARD_IMAGE = '/cards/kraken.jpg';

export const WHITE_WHALE_CARD_IMAGE = '/cards/white-whale.jpg';

export const HARRY_CARD_IMAGE = '/cards/harry-the-giant.jpg';

export const RASCAL_CARD_IMAGE = '/cards/rascal-of-roatan.jpg';
