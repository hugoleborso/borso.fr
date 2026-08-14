import { Chess } from 'chess.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ALL_SELECTION, buildDriver, ITALIAN_GAME, ITALIAN_SCOPE } from './playMachine.test-utils';
import { createPlayMachine, type PlayMachineConfig } from './playMachine.utils';

const BASE_CONFIG: PlayMachineConfig = {
  openings: [ITALIAN_GAME],
  selection: ALL_SELECTION,
  playScope: ITALIAN_SCOPE,
  side: 'white',
  autoOpponent: true,
};

const STARTING_FEN = new Chess().fen();
const PRODUCTION_OPPONENT_DELAY_MS = 200;
const ITALIAN_LINE_COUNT = 2;

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

/**
 * @Blueprint test-machine-transition
 * @BlueprintName State Machine Transition Test
 * @BlueprintUsage Use for a hand written machine, to assert each command's effect on the snapshot rather than the calls it made.
 * @BlueprintDescription Builds the machine with the driver's injected timer and picker, then walks it one command at a time and asserts on `getSnapshot()` after each. Timers are fired by hand through `fireNextTimer`, so the opponent's reply lands at a point the test chose and the suite never waits, and the scheduled delay is asserted against the production default because the driver deliberately leaves `opponentDelayMs` unset. Positions are checked against a `Chess` instance built independently from the same moves, so a bug in the machine's own board handling cannot make the assertion agree with it.
 */
describe('createPlayMachine', () => {
  it('returns the INITIAL snapshot before start is called', () => {
    const machine = createPlayMachine();
    const snapshot = machine.getSnapshot();
    expect(snapshot.playedMovesUci).toEqual([]);
    expect(snapshot.inBook).toBe(false);
    expect(snapshot.outOfBookOpen).toBe(false);
    expect(snapshot.fen).toBe(STARTING_FEN);
  });

  it('rejects playMove before start', () => {
    const machine = createPlayMachine();
    expect(machine.playMove('e2e4')).toBe('rejected-out-of-book');
  });

  it('reset / undo / reveal / dismiss / setAutoOpponent are no-ops before start', () => {
    const machine = createPlayMachine();
    machine.reset();
    machine.undo();
    machine.revealBookMoves();
    machine.dismissOutOfBook();
    machine.dismissSuccess();
    machine.setAutoOpponent(false);
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
  });

  it('start exposes the in-book status, the legal first moves, and a clean board', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start(BASE_CONFIG);
    const snapshot = machine.getSnapshot();
    expect(snapshot.inBook).toBe(true);
    expect(new Set(snapshot.nextBookMovesUci)).toEqual(new Set(['e2e4']));
    expect(snapshot.candidateCount).toBe(ITALIAN_LINE_COUNT);
    expect(snapshot.uniqueOpening?.id).toBe('italian-game');
    expect(snapshot.uniqueVariation?.id).toBe('main');
    expect(snapshot.uniqueLine).toBeUndefined();
    expect(snapshot.fen).toBe(STARTING_FEN);
    expect(snapshot.playedMovesUci).toEqual([]);
    expect(snapshot.outOfBookOpen).toBe(false);
    expect(snapshot.successOpen).toBe(false);
    expect(snapshot.manualReveal).toBe(false);
  });

  it('notifies subscribers on every state change and stops after unsubscribe', () => {
    const driver = buildDriver();
    const machine = createPlayMachine(driver.options);
    let calls = 0;
    const unsubscribe = machine.subscribe(() => {
      calls += 1;
    });
    machine.start(BASE_CONFIG);
    expect(calls).toBe(1);
    machine.playMove('e2e4');
    expect(calls).toBe(2);
    unsubscribe();
    driver.fireNextTimer();
    expect(calls).toBe(2);
  });

  it('schedules an opponent reply after the user moves', () => {
    const driver = buildDriver();
    driver.rngQueue.push('e7e5');
    const machine = createPlayMachine(driver.options);
    machine.start(BASE_CONFIG);
    machine.playMove('e2e4');
    expect(driver.pendingTimers).toHaveLength(1);
    driver.fireNextTimer();
    expect(machine.getSnapshot().playedMovesUci).toEqual(['e2e4', 'e7e5']);
    expect(machine.getSnapshot().fen).toBe(fenAfter(['e4', 'e5']));
    expect(machine.getSnapshot().successOpen).toBe(false);
  });

  it('schedules the opponent reply at the production delay when none is injected', () => {
    const driver = buildDriver();
    const machine = createPlayMachine(driver.options);
    machine.start(BASE_CONFIG);
    machine.playMove('e2e4');
    expect(driver.pendingTimers[0]?.delayMs).toBe(PRODUCTION_OPPONENT_DELAY_MS);
  });

  it('schedules the opponent reply at the injected delay', () => {
    const driver = buildDriver();
    const machine = createPlayMachine({ ...driver.options, opponentDelayMs: 42 });
    machine.start(BASE_CONFIG);
    machine.playMove('e2e4');
    expect(driver.pendingTimers[0]?.delayMs).toBe(42);
  });

  it("plays White's first move when side is Black (B1)", () => {
    const driver = buildDriver();
    const machine = createPlayMachine(driver.options);
    machine.start({ ...BASE_CONFIG, side: 'black' });
    expect(driver.pendingTimers).toHaveLength(1);
    driver.fireNextTimer();
    expect(machine.getSnapshot().playedMovesUci).toEqual(['e2e4']);
  });

  it('does not auto-play when autoOpponent is false', () => {
    const driver = buildDriver();
    const machine = createPlayMachine(driver.options);
    machine.start({ ...BASE_CONFIG, autoOpponent: false });
    machine.playMove('e2e4');
    expect(driver.pendingTimers).toHaveLength(0);
  });

  it("rejects a play during the opponent's turn when autoOpponent is on", () => {
    const driver = buildDriver();
    const machine = createPlayMachine(driver.options);
    machine.start(BASE_CONFIG);
    machine.playMove('e2e4');
    expect(machine.playMove('e7e5')).toBe('rejected-opponents-turn');
  });

  it('allows the user to play both sides when autoOpponent is off', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start({ ...BASE_CONFIG, autoOpponent: false });
    expect(machine.playMove('e2e4')).toBe('accepted');
    // With autoOpponent off, the user is allowed to play Black's reply.
    expect(machine.playMove('e7e5')).toBe('accepted');
    expect(machine.getSnapshot().fen).toBe(fenAfter(['e4', 'e5']));
  });

  it('rejects an out-of-book move and opens the modal, not advancing playedMoves', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start(BASE_CONFIG);
    expect(machine.playMove('a2a3')).toBe('rejected-out-of-book');
    expect(machine.getSnapshot().outOfBookOpen).toBe(true);
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
    expect(machine.getSnapshot().fen).toBe(STARTING_FEN);
  });

  it('rejects an illegal move without opening the out-of-book modal', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start(BASE_CONFIG);
    expect(machine.playMove('e2e5')).toBe('rejected-out-of-book');
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
    // An illegal move never reached the board, so it is not a departure from
    // the book and the modal stays shut.
    expect(machine.getSnapshot().outOfBookOpen).toBe(false);
  });

  it('leaves the board untouched when an illegal move is attempted mid-game', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start({ ...BASE_CONFIG, autoOpponent: false });
    machine.playMove('e2e4');
    expect(machine.playMove('e2e5')).toBe('rejected-out-of-book');
    expect(machine.getSnapshot().fen).toBe(fenAfter(['e4']));
    expect(machine.getSnapshot().playedMovesUci).toEqual(['e2e4']);
  });

  it('leaves successOpen shut on a move that does not end a line', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start({ ...BASE_CONFIG, autoOpponent: false });
    machine.playMove('e2e4');
    expect(machine.getSnapshot().successOpen).toBe(false);
    expect(machine.getSnapshot().atLineEnd).toBe(false);
  });

  it('marks atLineEnd + successOpen when the user plays the last move in a line', () => {
    const machine = createPlayMachine(buildDriver().options);
    // Drill to ply 4 with autoOpponent off so the user controls both sides.
    machine.start({ ...BASE_CONFIG, autoOpponent: false });
    machine.playMove('e2e4');
    machine.playMove('e7e5');
    machine.playMove('g1f3');
    machine.playMove('b8c6');
    machine.playMove('f1c4'); // matches Classical line — atLineEnd
    expect(machine.getSnapshot().atLineEnd).toBe(true);
    expect(machine.getSnapshot().successOpen).toBe(true);
    expect(machine.getSnapshot().uniqueLine?.id).toBe('classical');
  });

  it('schedules no opponent reply once the user has reached the end of a line', () => {
    const driver = buildDriver();
    const machine = createPlayMachine(driver.options);
    machine.start(BASE_CONFIG);
    machine.playMove('e2e4');
    driver.fireNextTimer(); // e7e5
    machine.playMove('g1f3');
    driver.fireNextTimer(); // b8c6
    machine.playMove('f1c4'); // ends the Classical line
    expect(machine.getSnapshot().atLineEnd).toBe(true);
    expect(driver.pendingTimers).toHaveLength(0);
  });

  it("marks successOpen when the opponent's reply ends a line (side=black)", () => {
    const driver = buildDriver();
    driver.rngQueue.push('e2e4');
    driver.rngQueue.push('g1f3');
    driver.rngQueue.push('f1c4');
    const machine = createPlayMachine(driver.options);
    machine.start({ ...BASE_CONFIG, side: 'black' });
    driver.fireNextTimer(); // opponent plays e2e4
    machine.playMove('e7e5');
    driver.fireNextTimer(); // opponent plays g1f3
    machine.playMove('b8c6');
    driver.fireNextTimer(); // opponent plays f1c4 — Classical line ends
    expect(machine.getSnapshot().atLineEnd).toBe(true);
    expect(machine.getSnapshot().successOpen).toBe(true);
  });

  it('drops a stale opponent timeout after a reset (B5)', () => {
    const driver = buildDriver();
    driver.rngQueue.push('e7e5');
    const machine = createPlayMachine(driver.options);
    machine.start(BASE_CONFIG);
    machine.playMove('e2e4');
    expect(driver.pendingTimers).toHaveLength(1);
    machine.reset();
    driver.fireNextTimer(); // belongs to the previous run → bail
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
  });

  it('reset clears the modals the previous game left open', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start({ ...BASE_CONFIG, autoOpponent: false });
    machine.playMove('e2e4');
    machine.playMove('e7e5');
    machine.playMove('g1f3');
    machine.playMove('b8c6');
    machine.playMove('f1c4'); // successOpen
    machine.revealBookMoves(); // manualReveal
    machine.playMove('a7a6'); // out of book → outOfBookOpen
    expect(machine.getSnapshot().successOpen).toBe(true);
    expect(machine.getSnapshot().outOfBookOpen).toBe(true);
    expect(machine.getSnapshot().manualReveal).toBe(true);
    machine.reset();
    expect(machine.getSnapshot().successOpen).toBe(false);
    expect(machine.getSnapshot().outOfBookOpen).toBe(false);
    expect(machine.getSnapshot().manualReveal).toBe(false);
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
    expect(machine.getSnapshot().fen).toBe(STARTING_FEN);
  });

  it('reveals book moves once, and a second reveal notifies nobody', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start(BASE_CONFIG);
    const notifications = countNotifications(machine);
    machine.revealBookMoves();
    expect(machine.getSnapshot().manualReveal).toBe(true);
    expect(machine.getSnapshot().outOfBookOpen).toBe(false);
    expect(notifications.read()).toBe(1);
    machine.revealBookMoves(); // idempotent
    expect(machine.getSnapshot().manualReveal).toBe(true);
    expect(notifications.read()).toBe(1);
    machine.playMove('e2e4');
    expect(machine.getSnapshot().manualReveal).toBe(false);
  });

  it('dismissOutOfBook closes the modal, and dismissing a closed modal notifies nobody', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start(BASE_CONFIG);
    machine.playMove('a2a3');
    expect(machine.getSnapshot().outOfBookOpen).toBe(true);
    const notifications = countNotifications(machine);
    machine.dismissOutOfBook();
    expect(machine.getSnapshot().outOfBookOpen).toBe(false);
    expect(notifications.read()).toBe(1);
    machine.dismissOutOfBook();
    expect(machine.getSnapshot().outOfBookOpen).toBe(false);
    expect(notifications.read()).toBe(1);
  });

  it('dismissSuccess closes the success state, and dismissing it twice notifies nobody', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start({ ...BASE_CONFIG, autoOpponent: false });
    machine.playMove('e2e4');
    machine.playMove('e7e5');
    machine.playMove('g1f3');
    machine.playMove('b8c6');
    machine.playMove('f1c4');
    expect(machine.getSnapshot().successOpen).toBe(true);
    const notifications = countNotifications(machine);
    machine.dismissSuccess();
    expect(machine.getSnapshot().successOpen).toBe(false);
    expect(notifications.read()).toBe(1);
    machine.dismissSuccess();
    expect(machine.getSnapshot().successOpen).toBe(false);
    expect(notifications.read()).toBe(1);
  });

  it('undo with autoOpponent off pops one ply', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start({ ...BASE_CONFIG, autoOpponent: false });
    machine.playMove('e2e4');
    machine.undo();
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
  });

  it('undo rewinds the board by exactly one ply when autoOpponent is off', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start({ ...BASE_CONFIG, autoOpponent: false });
    machine.playMove('e2e4');
    machine.playMove('e7e5');
    machine.playMove('g1f3');
    machine.undo();
    expect(machine.getSnapshot().playedMovesUci).toEqual(['e2e4', 'e7e5']);
    expect(machine.getSnapshot().fen).toBe(fenAfter(['e4', 'e5']));
  });

  it('undo with autoOpponent on pops two plies (user move + opponent reply)', () => {
    const driver = buildDriver();
    driver.rngQueue.push('e7e5');
    const machine = createPlayMachine(driver.options);
    machine.start(BASE_CONFIG);
    machine.playMove('e2e4');
    driver.fireNextTimer();
    machine.undo();
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
  });

  it('undo rewinds the board by exactly two plies when autoOpponent is on', () => {
    const driver = buildDriver();
    const machine = createPlayMachine(driver.options);
    machine.start(BASE_CONFIG);
    machine.playMove('e2e4');
    driver.fireNextTimer(); // e7e5
    machine.playMove('g1f3');
    driver.fireNextTimer(); // b8c6
    machine.undo();
    expect(machine.getSnapshot().playedMovesUci).toEqual(['e2e4', 'e7e5']);
    expect(machine.getSnapshot().fen).toBe(fenAfter(['e4', 'e5']));
  });

  it('undo clears the modals and the manual reveal', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start({ ...BASE_CONFIG, autoOpponent: false });
    machine.playMove('e2e4');
    machine.playMove('e7e5');
    machine.playMove('g1f3');
    machine.playMove('b8c6');
    machine.playMove('f1c4'); // successOpen
    machine.revealBookMoves(); // manualReveal
    machine.playMove('a7a6'); // outOfBookOpen
    machine.undo();
    expect(machine.getSnapshot().successOpen).toBe(false);
    expect(machine.getSnapshot().outOfBookOpen).toBe(false);
    expect(machine.getSnapshot().manualReveal).toBe(false);
  });

  it('undo is a no-op when there are not enough plies to undo', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start(BASE_CONFIG);
    machine.undo();
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
  });

  it('undo leaves the out-of-book modal open when there is nothing to undo', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start(BASE_CONFIG);
    machine.playMove('a2a3');
    expect(machine.getSnapshot().outOfBookOpen).toBe(true);
    machine.undo();
    expect(machine.getSnapshot().outOfBookOpen).toBe(true);
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
  });

  it('setAutoOpponent flips the flag, and setting it to the value it already has notifies nobody', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start(BASE_CONFIG);
    const notifications = countNotifications(machine);
    machine.setAutoOpponent(true); // already on
    expect(machine.getSnapshot().autoOpponent).toBe(true);
    expect(notifications.read()).toBe(0);
    machine.setAutoOpponent(false);
    expect(machine.getSnapshot().autoOpponent).toBe(false);
    expect(notifications.read()).toBe(1);
    machine.setAutoOpponent(false); // idempotent
    expect(notifications.read()).toBe(1);
    machine.setAutoOpponent(true);
    expect(machine.getSnapshot().autoOpponent).toBe(true);
    expect(notifications.read()).toBe(2);
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
  });

  it('lets an already scheduled reply land, and publishes the new autoOpponent value with it', () => {
    const driver = buildDriver();
    driver.rngQueue.push('e7e5');
    const machine = createPlayMachine(driver.options);
    machine.start(BASE_CONFIG);
    machine.playMove('e2e4');
    machine.setAutoOpponent(false);
    driver.fireNextTimer();
    expect(machine.getSnapshot().playedMovesUci).toEqual(['e2e4', 'e7e5']);
    expect(machine.getSnapshot().autoOpponent).toBe(false);
  });

  it('does not auto-play opening move when no candidate matches the scope', () => {
    const driver = buildDriver();
    const machine = createPlayMachine(driver.options);
    machine.start({
      ...BASE_CONFIG,
      side: 'black',
      playScope: { openingIds: ['nonexistent'], variationIds: [], lineIds: [] },
    });
    expect(driver.pendingTimers).toHaveLength(0);
    expect(machine.getSnapshot().inBook).toBe(false);
  });

  it('drops the opponent move when the picker returns undefined (empty candidates)', () => {
    const driver = buildDriver();
    driver.options.pickRandom = () => undefined;
    const machine = createPlayMachine(driver.options);
    machine.start(BASE_CONFIG);
    machine.playMove('e2e4');
    driver.fireNextTimer();
    expect(machine.getSnapshot().playedMovesUci).toEqual(['e2e4']);
  });

  describe('default picker + scheduler', () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('uses Math.random + the global setTimeout when options are omitted', () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const machine = createPlayMachine();
      machine.start(BASE_CONFIG);
      machine.playMove('e2e4');
      vi.runAllTimers();
      expect(machine.getSnapshot().playedMovesUci).toEqual(['e2e4', 'e7e5']);
    });
  });
});
