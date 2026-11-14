import { describe, expect, it } from 'vitest';
import type { ReaderMove } from './deck-build.core';
import {
  buildGateFinding,
  computeLoss,
  decideGateVerdict,
  ENGINE_HASH_MEGABYTES,
  EXCEPTION_CEILING_CENTIPAWNS,
  formatFinding,
  formatGateReport,
  isForcedSearchNeeded,
  isGatePassed,
  listMovesToCheck,
  READER_MOVE_MARGIN_CENTIPAWNS,
  SEARCH_DEPTH,
} from './engine-gate.core';

const EXCEPTION = { movesSan: ['d4', 'd5', 'c4', 'e5'], reason: 'A sound gambit known to theory.' };

function buildMove(overrides: Partial<ReaderMove> = {}): ReaderMove {
  return {
    deckId: 'albin-countergambit',
    lineName: 'Main line',
    ply: 4,
    pathSan: ['d4', 'd5', 'c4', 'e5'],
    pathUci: 'd2d4 d7d5 c2c4 e7e5',
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2',
    positionKey: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -',
    opponentMoveUci: 'c2c4',
    moveUci: 'e7e5',
    moveSan: 'e5',
    ideaPositionKey: 'rnbqkbnr/ppp2ppp/8/3pp3/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -',
    exception: null,
    ...overrides,
  };
}

// @FollowsBlueprint test-pure-unit
describe('the gate parameters', () => {
  it('are the plan values', () => {
    expect(READER_MOVE_MARGIN_CENTIPAWNS).toBe(100);
    expect(EXCEPTION_CEILING_CENTIPAWNS).toBe(250);
    expect(SEARCH_DEPTH).toBe(16);
    expect(ENGINE_HASH_MEGABYTES).toBe(64);
  });
});

describe('the loss of a reader move', () => {
  it('is zero when the engine prefers the book move, and needs no second search', () => {
    const free = { scoreCentipawns: -20, bestMoveUci: 'e7e5' };
    expect(isForcedSearchNeeded(free, 'e7e5')).toBe(false);
    expect(computeLoss(free, null)).toBe(0);
  });

  it('is the free score minus the forced score', () => {
    const free = { scoreCentipawns: -20, bestMoveUci: 'e7e6' };
    expect(isForcedSearchNeeded(free, 'e7e5')).toBe(true);
    expect(computeLoss(free, { scoreCentipawns: -74, bestMoveUci: 'e7e5' })).toBe(54);
  });

  it('counts a mate the book move walks into as a loss of about 10,000', () => {
    const free = { scoreCentipawns: 30, bestMoveUci: 'g8f6' };
    expect(computeLoss(free, { scoreCentipawns: -10_000, bestMoveUci: 'f7f6' })).toBe(10_030);
  });
});

describe('decideGateVerdict', () => {
  it('passes a move inside the margin, at the margin included', () => {
    expect(decideGateVerdict(0, false)).toBe('inside-margin');
    expect(decideGateVerdict(100, false)).toBe('inside-margin');
    expect(decideGateVerdict(-15, false)).toBe('inside-margin');
  });

  it('fails a move over the margin', () => {
    expect(decideGateVerdict(101, false)).toBe('over-margin');
    expect(decideGateVerdict(250, false)).toBe('over-margin');
  });

  it('passes a move over the margin that carries an exception', () => {
    expect(decideGateVerdict(101, true)).toBe('excused');
    expect(decideGateVerdict(250, true)).toBe('excused');
  });

  it('fails a move over the ceiling, with or without an exception', () => {
    expect(decideGateVerdict(251, true)).toBe('over-ceiling');
    expect(decideGateVerdict(251, false)).toBe('over-ceiling');
    expect(decideGateVerdict(10_030, true)).toBe('over-ceiling');
  });

  it('fails an exception that excuses nothing', () => {
    expect(decideGateVerdict(100, true)).toBe('stale-exception');
    expect(decideGateVerdict(0, true)).toBe('stale-exception');
  });
});

describe('buildGateFinding and isGatePassed', () => {
  const free = { scoreCentipawns: -20, bestMoveUci: 'e7e6' };

  it('reads the exception off the move', () => {
    const forced = { scoreCentipawns: -150, bestMoveUci: 'e7e5' };
    expect(buildGateFinding(buildMove(), free, forced)).toEqual({
      move: buildMove(),
      lossCentipawns: 130,
      bestMoveUci: 'e7e6',
      verdict: 'over-margin',
    });
    expect(buildGateFinding(buildMove({ exception: EXCEPTION }), free, forced).verdict).toBe(
      'excused',
    );
  });

  it('passes only when every move is inside the margin or excused', () => {
    const inside = buildGateFinding(buildMove(), free, null);
    const excused = buildGateFinding(buildMove({ exception: EXCEPTION }), free, {
      scoreCentipawns: -150,
      bestMoveUci: 'e7e5',
    });
    const stale = buildGateFinding(buildMove({ exception: EXCEPTION }), free, null);
    expect(isGatePassed([])).toBe(true);
    expect(isGatePassed([inside, excused])).toBe(true);
    expect(isGatePassed([inside, stale])).toBe(false);
    expect(isGatePassed([{ ...inside, verdict: 'over-margin' }])).toBe(false);
    expect(isGatePassed([{ ...inside, verdict: 'over-ceiling' }, inside])).toBe(false);
  });
});

describe('listMovesToCheck', () => {
  it('searches a position and move once, and keeps the first line that plays it', () => {
    const first = buildMove();
    const shared = buildMove({ lineName: 'Lasker Trap' });
    const other = buildMove({ moveUci: 'e7e6', moveSan: 'e6' });
    const elsewhere = buildMove({ positionKey: 'another b KQkq -' });
    expect(listMovesToCheck([first, shared, other, elsewhere], null)).toEqual([
      first,
      other,
      elsewhere,
    ]);
  });

  it('limits the run to one deck', () => {
    const albin = buildMove();
    const vienna = buildMove({ deckId: 'vienna-game', positionKey: 'another w KQkq -' });
    expect(listMovesToCheck([albin, vienna], 'vienna-game')).toEqual([vienna]);
    expect(listMovesToCheck([albin, vienna], 'none')).toEqual([]);
  });
});

describe('the report', () => {
  const free = { scoreCentipawns: -20, bestMoveUci: 'e7e6' };
  const inside = buildGateFinding(buildMove(), free, null);
  const overMargin = buildGateFinding(buildMove(), free, {
    scoreCentipawns: -150,
    bestMoveUci: 'e7e5',
  });
  const excused = buildGateFinding(buildMove({ exception: EXCEPTION }), free, {
    scoreCentipawns: -150,
    bestMoveUci: 'e7e5',
  });

  it('names the deck, the path, the loss and the best move of a finding', () => {
    expect(formatFinding(overMargin)).toBe(
      'albin-countergambit: d4 d5 c4 e5 loses 130 centipawns (best e7e6) and loses more than 100 centipawns and carries no exception',
    );
    expect(formatFinding(excused)).toBe(
      'albin-countergambit: d4 d5 c4 e5 loses 130 centipawns (best e7e6) and is over the margin and carries an exception',
    );
    expect(formatFinding({ ...overMargin, verdict: 'over-ceiling' })).toBe(
      'albin-countergambit: d4 d5 c4 e5 loses 130 centipawns (best e7e6) and loses more than 250 centipawns, which no exception excuses',
    );
    expect(formatFinding({ ...inside, verdict: 'stale-exception' })).toBe(
      'albin-countergambit: d4 d5 c4 e5 loses 0 centipawns (best e7e6) and is inside the margin, so its exception excuses nothing and must go',
    );
    expect(formatFinding(inside)).toBe(
      'albin-countergambit: d4 d5 c4 e5 loses 0 centipawns (best e7e6) and is inside the margin',
    );
  });

  it('prints only the count when every move is inside the margin', () => {
    expect(formatGateReport([inside, inside])).toEqual([
      '2 reader moves checked at depth 16, 0 failed',
    ]);
  });

  it('prints the excused moves, the failures and a stub with an empty reason for a bare failure', () => {
    expect(
      formatGateReport([inside, excused, overMargin, { ...overMargin, verdict: 'over-ceiling' }]),
    ).toEqual([
      formatFinding(excused),
      formatFinding(overMargin),
      formatFinding({ ...overMargin, verdict: 'over-ceiling' }),
      '{\n  "movesSan": [\n    "d4",\n    "d5",\n    "c4",\n    "e5"\n  ],\n  "reason": ""\n}',
      '4 reader moves checked at depth 16, 2 failed',
    ]);
  });
});
