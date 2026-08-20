import { Chess } from 'chess.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDriver, ITALIAN_MAIN } from './learnTreeMachine.test-utils';
import { createLearnTreeMachine } from './learnTreeMachine.utils';
import type { Variation } from './types';

const STARTING_FEN = new Chess().fen();
const PRODUCTION_OPPONENT_DELAY_MS = 250;

function fenAfter(movesSan: string[]): string {
  const chess = new Chess();
  for (const san of movesSan) chess.move(san);
  return chess.fen();
}

function countNotifications(machine: { subscribe: (listener: () => void) => () => void }): {
  read: () => number;
} {
  let calls = 0;
  machine.subscribe(() => {
    calls += 1;
  });
  return { read: () => calls };
}

// @FollowsBlueprint test-machine-transition
describe('createLearnTreeMachine', () => {
  it('produces an INITIAL snapshot before start is called', () => {
    const machine = createLearnTreeMachine();
    const snapshot = machine.getSnapshot();
    expect(snapshot.variationId).toBeNull();
    expect(snapshot.playedMovesUci).toEqual([]);
    expect(snapshot.variationCleared).toBe(false);
    expect(snapshot.fen).toBe(STARTING_FEN);
  });

  it('rejects playMove before start', () => {
    const machine = createLearnTreeMachine();
    expect(machine.playMove('e2e4')).toBe('rejected-no-variation');
  });

  it('reset is a no-op before start', () => {
    const machine = createLearnTreeMachine();
    machine.reset();
    expect(machine.getSnapshot().variationId).toBeNull();
  });

  it('arrow / dismiss toggles are no-ops before start', () => {
    const machine = createLearnTreeMachine();
    machine.dismissOutOfBook();
    machine.revealArrows();
    machine.hideArrows();
    expect(machine.getSnapshot().variationId).toBeNull();
    expect(machine.getSnapshot().showRevealedArrows).toBe(false);
  });

  it('start exposes the variation, side, and the legal first moves', () => {
    const machine = createLearnTreeMachine(buildDriver().options);
    machine.start(ITALIAN_MAIN, 'white');
    const snapshot = machine.getSnapshot();
    expect(snapshot.variationId).toBe('main');
    expect(snapshot.side).toBe('white');
    expect(new Set(snapshot.nextBookMovesUci)).toEqual(new Set(['e2e4']));
    expect(snapshot.playedMovesUci).toEqual([]);
    expect(snapshot.fen).toBe(STARTING_FEN);
    expect(snapshot.outOfBookOpen).toBe(false);
    expect(snapshot.showRevealedArrows).toBe(false);
    expect(snapshot.visitedLeafIds.size).toBe(0);
  });

  it('notifies subscribers on every state change and stops after unsubscribe', () => {
    const driver = buildDriver();
    const machine = createLearnTreeMachine(driver.options);
    let calls = 0;
    const unsubscribe = machine.subscribe(() => {
      calls += 1;
    });
    machine.start(ITALIAN_MAIN, 'white');
    expect(calls).toBe(1);
    machine.playMove('e2e4');
    expect(calls).toBe(2);
    unsubscribe();
    driver.fireNextTimer(); // opponent move fires; subscriber no longer counted
    expect(calls).toBe(2);
  });

  it("schedules an opponent reply after a user move when it is the opponent's turn", () => {
    const driver = buildDriver();
    driver.rngQueue.push('e7e5');
    const machine = createLearnTreeMachine(driver.options);
    machine.start(ITALIAN_MAIN, 'white');
    machine.playMove('e2e4');
    expect(driver.pendingTimers).toHaveLength(1);
    driver.fireNextTimer();
    expect(machine.getSnapshot().playedMovesUci).toEqual(['e2e4', 'e7e5']);
  });

  it('advances the board with every move, its own and the opponent reply', () => {
    const driver = buildDriver();
    const machine = createLearnTreeMachine(driver.options);
    machine.start(ITALIAN_MAIN, 'white');
    machine.playMove('e2e4');
    expect(machine.getSnapshot().fen).toBe(fenAfter(['e4']));
    driver.fireNextTimer();
    expect(machine.getSnapshot().fen).toBe(fenAfter(['e4', 'e5']));
    machine.playMove('g1f3');
    expect(machine.getSnapshot().fen).toBe(fenAfter(['e4', 'e5', 'Nf3']));
  });

  it('schedules the opponent reply at the production delay when none is injected', () => {
    const driver = buildDriver();
    const machine = createLearnTreeMachine(driver.options);
    machine.start(ITALIAN_MAIN, 'white');
    machine.playMove('e2e4');
    expect(driver.pendingTimers[0]?.delayMs).toBe(PRODUCTION_OPPONENT_DELAY_MS);
  });

  it('schedules the opponent reply at the injected delay', () => {
    const driver = buildDriver();
    const machine = createLearnTreeMachine({ ...driver.options, opponentDelayMs: 40 });
    machine.start(ITALIAN_MAIN, 'white');
    machine.playMove('e2e4');
    expect(driver.pendingTimers[0]?.delayMs).toBe(40);
  });

  it("plays White's first move when side is Black", () => {
    const driver = buildDriver();
    const machine = createLearnTreeMachine(driver.options);
    machine.start(ITALIAN_MAIN, 'black');
    expect(driver.pendingTimers).toHaveLength(1);
    driver.fireNextTimer();
    expect(machine.getSnapshot().playedMovesUci).toEqual(['e2e4']);
  });

  it('gives the turn back to a Black player, then replies again on the next even ply', () => {
    const driver = buildDriver();
    const machine = createLearnTreeMachine(driver.options);
    machine.start(ITALIAN_MAIN, 'black');
    driver.fireNextTimer(); // White opens with e2e4
    expect(machine.playMove('e7e5')).toBe('accepted');
    expect(driver.pendingTimers).toHaveLength(1);
    driver.fireNextTimer();
    expect(machine.getSnapshot().playedMovesUci).toEqual(['e2e4', 'e7e5', 'g1f3']);
  });

  it('marks the leaf visited and flips variationCleared once every leaf is reached', () => {
    const driver = buildDriver();
    const machine = createLearnTreeMachine(driver.options);
    // Drill the Classical line first.
    machine.start(ITALIAN_MAIN, 'white');
    driver.rngQueue.push('e7e5');
    machine.playMove('e2e4');
    driver.fireNextTimer();
    driver.rngQueue.push('b8c6');
    machine.playMove('g1f3');
    driver.fireNextTimer();
    machine.playMove('f1c4');
    expect(machine.getSnapshot().visitedLeafIds.has('classical')).toBe(true);
    expect(machine.getSnapshot().variationCleared).toBe(false);
    // Restart and drill the Two Knights line.
    machine.reset();
    driver.rngQueue.push('e7e5');
    machine.playMove('e2e4');
    driver.fireNextTimer();
    driver.rngQueue.push('b8c6');
    machine.playMove('g1f3');
    driver.fireNextTimer();
    machine.playMove('f1b5');
    const snapshot = machine.getSnapshot();
    expect(snapshot.visitedLeafIds.has('two-knights')).toBe(true);
    // Reset clears visited; classical should NOT be in the set after the second drill.
    expect(snapshot.visitedLeafIds.has('classical')).toBe(false);
  });

  it('rejects a move that is not in book and opens the out-of-book modal', () => {
    const driver = buildDriver();
    const machine = createLearnTreeMachine(driver.options);
    machine.start(ITALIAN_MAIN, 'white');
    expect(machine.playMove('a2a3')).toBe('rejected-out-of-book');
    expect(machine.getSnapshot().outOfBookOpen).toBe(true);
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
    expect(machine.getSnapshot().fen).toBe(STARTING_FEN);
  });

  it('dismissOutOfBook closes the modal, and dismissing a closed modal notifies nobody', () => {
    const machine = createLearnTreeMachine(buildDriver().options);
    machine.start(ITALIAN_MAIN, 'white');
    machine.playMove('a2a3'); // out-of-book → open
    expect(machine.getSnapshot().outOfBookOpen).toBe(true);
    const notifications = countNotifications(machine);
    machine.dismissOutOfBook();
    expect(machine.getSnapshot().outOfBookOpen).toBe(false);
    expect(notifications.read()).toBe(1);
    machine.dismissOutOfBook(); // no-op
    expect(machine.getSnapshot().outOfBookOpen).toBe(false);
    expect(notifications.read()).toBe(1);
  });

  it('reveals and hides arrows; a toggle that changes nothing notifies nobody', () => {
    const driver = buildDriver();
    const machine = createLearnTreeMachine(driver.options);
    machine.start(ITALIAN_MAIN, 'white');
    const notifications = countNotifications(machine);
    machine.revealArrows();
    expect(machine.getSnapshot().showRevealedArrows).toBe(true);
    expect(notifications.read()).toBe(1);
    machine.revealArrows(); // no-op
    expect(machine.getSnapshot().showRevealedArrows).toBe(true);
    expect(notifications.read()).toBe(1);
    machine.hideArrows();
    expect(machine.getSnapshot().showRevealedArrows).toBe(false);
    expect(notifications.read()).toBe(2);
    machine.hideArrows(); // no-op
    expect(machine.getSnapshot().showRevealedArrows).toBe(false);
    expect(notifications.read()).toBe(2);
    machine.revealArrows();
    machine.playMove('e2e4');
    expect(machine.getSnapshot().showRevealedArrows).toBe(false);
  });

  it('reset clears the out-of-book modal and the revealed arrows', () => {
    const driver = buildDriver();
    const machine = createLearnTreeMachine(driver.options);
    machine.start(ITALIAN_MAIN, 'white');
    machine.playMove('a2a3'); // out-of-book → open
    machine.revealArrows();
    expect(machine.getSnapshot().outOfBookOpen).toBe(true);
    expect(machine.getSnapshot().showRevealedArrows).toBe(true);
    machine.reset();
    expect(machine.getSnapshot().outOfBookOpen).toBe(false);
    expect(machine.getSnapshot().showRevealedArrows).toBe(false);
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
    expect(machine.getSnapshot().fen).toBe(STARTING_FEN);
  });

  it('drops a stale opponent timeout after a reset begins a new run', () => {
    const driver = buildDriver();
    driver.rngQueue.push('e7e5');
    const machine = createLearnTreeMachine(driver.options);
    machine.start(ITALIAN_MAIN, 'white');
    machine.playMove('e2e4');
    expect(driver.pendingTimers).toHaveLength(1);
    machine.reset(); // a new run begins; the pending timer is now stale
    driver.fireNextTimer(); // fires but bails
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
  });

  it("rejects a play during the opponent's pending move", () => {
    const driver = buildDriver();
    const machine = createLearnTreeMachine(driver.options);
    machine.start(ITALIAN_MAIN, 'white');
    machine.playMove('e2e4');
    // Opponent timer is queued; user attempts to play in the same window.
    expect(machine.playMove('e7e5')).toBe('rejected-opponents-turn');
    // The pending timer is still there; firing it advances the opponent.
    driver.fireNextTimer();
    expect(machine.getSnapshot().playedMovesUci).toEqual(['e2e4', 'e7e5']);
  });

  it('drops the opponent move when the picker returns undefined (empty candidates)', () => {
    const driver = buildDriver();
    driver.options.pickRandom = () => undefined;
    const machine = createLearnTreeMachine(driver.options);
    machine.start(ITALIAN_MAIN, 'white');
    machine.playMove('e2e4');
    driver.fireNextTimer();
    expect(machine.getSnapshot().playedMovesUci).toEqual(['e2e4']);
  });

  it('does not enqueue a no-op opponent timer when reaching a leaf leaves no candidates', () => {
    const driver = buildDriver();
    // Two siblings diverging at ply 0; line A is 3 plies, line B is 1 ply.
    // After the user drills A to its leaf, line B is unvisited so
    // variationCleared stays false — playMove still calls scheduleOpponentMove,
    // but the matching line A has nothing left, so the upfront `length === 0`
    // guard fires and no timer enters the queue.
    const variation: Variation = {
      id: 'v',
      name: 'V',
      lines: [
        {
          id: 'a',
          name: 'A',
          eco: 'C20',
          movesSan: ['e4', 'e5', 'Nf3'],
          movesUci: ['e2e4', 'e7e5', 'g1f3'],
        },
        {
          id: 'b',
          name: 'B',
          eco: 'B20',
          movesSan: ['d4'],
          movesUci: ['d2d4'],
        },
      ],
    };
    const machine = createLearnTreeMachine(driver.options);
    machine.start(variation, 'white');
    driver.rngQueue.push('e7e5');
    machine.playMove('e2e4');
    driver.fireNextTimer();
    machine.playMove('g1f3');
    expect(machine.getSnapshot().visitedLeafIds.has('a')).toBe(true);
    expect(machine.getSnapshot().variationCleared).toBe(false);
    // Upfront guard prevents the no-op timer; queue is empty.
    expect(driver.pendingTimers).toHaveLength(0);
  });

  it("does not schedule an opponent reply when the variation is cleared after the user's move", () => {
    // One-line variation; user's last move clears the variation, no opponent reply.
    const trivial: Variation = {
      id: 'trivial',
      name: 'Trivial',
      lines: [
        {
          id: 'only',
          name: 'Only',
          eco: 'Z00',
          movesSan: ['e4'],
          movesUci: ['e2e4'],
        },
      ],
    };
    const driver = buildDriver();
    const machine = createLearnTreeMachine(driver.options);
    machine.start(trivial, 'white');
    machine.playMove('e2e4');
    expect(machine.getSnapshot().variationCleared).toBe(true);
    expect(driver.pendingTimers).toHaveLength(0);
  });

  describe('default picker + scheduler', () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('uses Math.random to pick a candidate and the global setTimeout to schedule it', () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const machine = createLearnTreeMachine();
      machine.start(ITALIAN_MAIN, 'white');
      expect(machine.playMove('e2e4')).toBe('accepted');
      vi.runAllTimers();
      // With Math.random pinned to 0, defaultPickRandom returns candidates[0].
      // Both Italian lines share 'e7e5' at this ply, so the picked move is 'e7e5'.
      expect(machine.getSnapshot().playedMovesUci).toEqual(['e2e4', 'e7e5']);
    });
  });

  it('uses the default RNG to pick when the picker has no seed available', () => {
    const driver = buildDriver();
    // Empty rngQueue → buildDriver's pickRandom falls back to candidates[0].
    const machine = createLearnTreeMachine(driver.options);
    machine.start(ITALIAN_MAIN, 'white');
    machine.playMove('e2e4');
    driver.fireNextTimer();
    expect(machine.getSnapshot().playedMovesUci).toEqual(['e2e4', 'e7e5']);
  });
});
