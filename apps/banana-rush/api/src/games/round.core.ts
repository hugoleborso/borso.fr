export const MINIMUM_CRATE_BANANAS = 1;

export interface PlayerBid {
  readonly playerId: string;
  readonly stashBefore: number;
  readonly bid: number;
}

export interface PlayerOutcome {
  readonly playerId: string;
  readonly bid: number;
  readonly stashBefore: number;
  readonly stashAfter: number;
  readonly crateWon: number;
  readonly tariffPaid: number;
  readonly tariffReceived: number;
  readonly busted: boolean;
}

export interface RoundResolution {
  readonly outcomes: readonly PlayerOutcome[];
  readonly crateBefore: number;
  readonly crateAfter: number;
  readonly crateWinnerIds: readonly string[];
  readonly bustedIds: readonly string[];
}

export interface ResolveRoundInput {
  readonly bids: readonly PlayerBid[];
  readonly crateBefore: number;
}

interface BidGroup {
  readonly bid: number;
  readonly earliestBidder: string;
  readonly earliestBidderStash: number;
  readonly playerIds: string[];
}

interface Settlement {
  readonly crateWinnerIds: readonly string[];
  readonly tariff: number;
  readonly tariffRecipientIds: readonly string[];
  readonly bustedIds: readonly string[];
}

const NO_TARIFF = 0;
const NOTHING_RECEIVED = 0;

const EMPTY_SETTLEMENT: Settlement = {
  crateWinnerIds: [],
  tariff: NO_TARIFF,
  tariffRecipientIds: [],
  bustedIds: [],
};

function groupBidsHighestFirst(bids: readonly PlayerBid[]): readonly BidGroup[] {
  const groupByBid = new Map<number, BidGroup>();
  for (const entry of bids) {
    const group = groupByBid.get(entry.bid);
    if (group === undefined) {
      groupByBid.set(entry.bid, {
        bid: entry.bid,
        earliestBidder: entry.playerId,
        earliestBidderStash: entry.stashBefore,
        playerIds: [entry.playerId],
      });
      continue;
    }
    group.playerIds.push(entry.playerId);
  }
  return [...groupByBid.values()].toSorted((left, right) => right.bid - left.bid);
}

function settleFrom(highest: BidGroup, below: readonly BidGroup[], crate: number): Settlement {
  const isTiedForHighest = highest.playerIds.length > 1;
  if (isTiedForHighest) {
    return { ...EMPTY_SETTLEMENT, crateWinnerIds: highest.playerIds };
  }

  const [runnerUp, ...rest] = below;
  if (runnerUp === undefined) {
    return { ...EMPTY_SETTLEMENT, crateWinnerIds: [highest.earliestBidder] };
  }

  const tariff = highest.bid - runnerUp.bid;
  const isPayable = highest.earliestBidderStash + crate >= tariff;
  if (isPayable) {
    return {
      crateWinnerIds: [highest.earliestBidder],
      tariff,
      tariffRecipientIds: runnerUp.playerIds,
      bustedIds: [],
    };
  }

  const afterTheBust = settleFrom(runnerUp, rest, crate);
  return { ...afterTheBust, bustedIds: [highest.earliestBidder, ...afterTheBust.bustedIds] };
}

/**
 * @Blueprint core-share-with-no-recipients
 * @BlueprintName Core Share With No Recipients
 * @BlueprintUsage Use where a total is divided between a list that is sometimes empty.
 * @BlueprintDescription Answers nothing each for an empty list rather than dividing by zero, and is exported so that case is a test of its own: reached only through the caller it would be an infinity nobody reads, which is the shape a surviving mutant hides in. The remainder is dropped rather than rounded up, because handing out more than the total would create value the rest of the rules assume cannot appear.
 */
export function splitEvenly(total: number, recipientCount: number): number {
  if (recipientCount === 0) return NOTHING_RECEIVED;
  return Math.floor(total / recipientCount);
}

/**
 * @Blueprint core-cascading-settlement
 * @BlueprintName Core Cascading Settlement
 * @BlueprintUsage Use for a rule that awards a pot to the strongest claim and falls through to the next claim when the strongest one cannot pay what it owes.
 * @BlueprintDescription Splits the rule into two pure steps that never touch the caller's records. `settleFrom` decides who owes what, taking the strongest group and the groups below it as two separate arguments, so a non empty list is expressed in the signature rather than checked at runtime; that is what lets the recursion carry no unreachable branch and reach full coverage honestly. Each group carries the stash of the one member that matters when the group holds a single bidder, so no lookup can miss and no fallback is needed. The fall through is the call stack rather than a mutable index. The second step turns the settlement into one outcome per participant by reading it, so everybody is described whether they won, paid, received or lost everything, and the caller gets a value it can store and broadcast without recomputing anything.
 */
export function resolveRound(input: ResolveRoundInput): RoundResolution {
  const [highest, ...below] = groupBidsHighestFirst(input.bids);
  const settlement =
    highest === undefined ? EMPTY_SETTLEMENT : settleFrom(highest, below, input.crateBefore);

  const crateShare = splitEvenly(input.crateBefore, settlement.crateWinnerIds.length);
  const tariffShare = splitEvenly(settlement.tariff, settlement.tariffRecipientIds.length);

  const outcomes = input.bids.map((entry) => {
    const isBusted = settlement.bustedIds.includes(entry.playerId);
    const isWonTheCrate = settlement.crateWinnerIds.includes(entry.playerId);
    const crateWon = isWonTheCrate ? crateShare : NOTHING_RECEIVED;
    const tariffPaid = isWonTheCrate ? settlement.tariff : NO_TARIFF;
    const tariffReceived = settlement.tariffRecipientIds.includes(entry.playerId)
      ? tariffShare
      : NOTHING_RECEIVED;
    const stashAfter = isBusted ? 0 : entry.stashBefore + crateWon + tariffReceived - tariffPaid;
    return {
      playerId: entry.playerId,
      bid: entry.bid,
      stashBefore: entry.stashBefore,
      stashAfter,
      crateWon,
      tariffPaid,
      tariffReceived,
      busted: isBusted,
    };
  });

  const highestStash = outcomes.reduce(
    (tallest, outcome) => Math.max(tallest, outcome.stashAfter),
    0,
  );

  return {
    outcomes,
    crateBefore: input.crateBefore,
    crateAfter: Math.max(highestStash, MINIMUM_CRATE_BANANAS),
    crateWinnerIds: settlement.crateWinnerIds,
    bustedIds: settlement.bustedIds,
  };
}
