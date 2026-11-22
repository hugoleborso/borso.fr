export const BONUS_KINDS = [
  'standardFourteen',
  'blackFourteen',
  'mermaidByPirate',
  'pirateBySkullKing',
  'skullKingByMermaid',
  'loot',
] as const;

export type BonusKind = (typeof BONUS_KINDS)[number];

export type BonusCounts = Readonly<Record<BonusKind, number>>;

export const BONUS_POINTS: BonusCounts = {
  standardFourteen: 10,
  blackFourteen: 20,
  mermaidByPirate: 20,
  pirateBySkullKing: 30,
  skullKingByMermaid: 40,
  loot: 20,
};

export const MAXIMUM_BONUS_COUNT: BonusCounts = {
  standardFourteen: 3,
  blackFourteen: 1,
  mermaidByPirate: 2,
  pirateBySkullKing: 6,
  skullKingByMermaid: 1,
  loot: 2,
};

export const NO_BONUS: BonusCounts = {
  standardFourteen: 0,
  blackFourteen: 0,
  mermaidByPirate: 0,
  pirateBySkullKing: 0,
  skullKingByMermaid: 0,
  loot: 0,
};

const POINTS_PER_TRICK_MADE = 20;
const POINTS_PER_TRICK_MISSED = 10;
const POINTS_PER_CARD_FOR_A_ZERO_BID = 10;

export const BID_ADJUSTMENTS = [-1, 0, 1] as const;
export type BidAdjustment = (typeof BID_ADJUSTMENTS)[number];

const NO_RASCAL_BET = 0;
const SMALL_RASCAL_BET = 10;
const LARGE_RASCAL_BET = 20;

export const RASCAL_BETS = [NO_RASCAL_BET, SMALL_RASCAL_BET, LARGE_RASCAL_BET] as const;
export type RascalBet = (typeof RASCAL_BETS)[number];

export interface ScoredEntry {
  readonly bid: number | null;
  readonly bidAdjustment: BidAdjustment;
  readonly rascalBet: RascalBet;
  readonly tricks: number | null;
  readonly bonuses: BonusCounts;
}

export function selectFinalBid(entry: ScoredEntry): number | null {
  return entry.bid === null ? null : Math.max(0, entry.bid + entry.bidAdjustment);
}

export function selectTricksTaken(entry: ScoredEntry): number | null {
  return entry.tricks ?? selectFinalBid(entry);
}

export function sumBonusPoints(bonuses: BonusCounts): number {
  return BONUS_KINDS.reduce((total, kind) => total + bonuses[kind] * BONUS_POINTS[kind], 0);
}

function scoreBid(bid: number, tricks: number, entry: ScoredEntry, cardCount: number): number {
  if (bid === 0) {
    const zeroBidPoints = POINTS_PER_CARD_FOR_A_ZERO_BID * cardCount;
    return tricks === 0 ? zeroBidPoints + sumBonusPoints(entry.bonuses) : -zeroBidPoints;
  }
  if (tricks === bid) return POINTS_PER_TRICK_MADE * bid + sumBonusPoints(entry.bonuses);
  return -POINTS_PER_TRICK_MISSED * Math.abs(bid - tricks);
}

// @FollowsBlueprint domain-shared-selection
export function scoreEntry(entry: ScoredEntry, cardCount: number): number | null {
  const bid = selectFinalBid(entry);
  if (bid === null) return null;
  const tricks = entry.tricks ?? bid;
  const rascalPoints = tricks === bid ? entry.rascalBet : -entry.rascalBet;
  return scoreBid(bid, tricks, entry, cardCount) + rascalPoints;
}

export function isBidMade(entry: ScoredEntry): boolean {
  const bid = selectFinalBid(entry);
  return bid !== null && selectTricksTaken(entry) === bid;
}
