import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ALL_SELECTION,
  buildDriver,
  ITALIAN_GAME,
  ITALIAN_SCOPE,
} from './playMachine.test-utils';
import { createPlayMachine, type PlayMachineConfig } from './playMachine.utils';

const BASE_CONFIG: PlayMachineConfig = {
  openings: [ITALIAN_GAME],
  selection: ALL_SELECTION,
  playScope: ITALIAN_SCOPE,
  side: 'white',
  autoOpponent: true,
};

describe('createPlayMachine', () => {
  it('returns the INITIAL snapshot before start is called', () => {
    const machine = createPlayMachine();
    const snapshot = machine.getSnapshot();
    expect(snapshot.playedMovesUci).toEqual([]);
    expect(snapshot.inBook).toBe(false);
    expect(snapshot.outOfBookOpen).toBe(false);
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

  it('start exposes the in-book status and the legal first moves', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start(BASE_CONFIG);
    const snapshot = machine.getSnapshot();
    expect(snapshot.inBook).toBe(true);
    expect(new Set(snapshot.nextBookMovesUci)).toEqual(new Set(['e2e4']));
    expect(snapshot.candidateCount).toBeGreaterThan(0);
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
  });

  it('plays White\'s first move when side is Black (B1)', () => {
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

  it('rejects a play during the opponent\'s turn when autoOpponent is on', () => {
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
  });

  it('rejects an out-of-book move and opens the modal, not advancing playedMoves', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start(BASE_CONFIG);
    expect(machine.playMove('a2a3')).toBe('rejected-out-of-book');
    expect(machine.getSnapshot().outOfBookOpen).toBe(true);
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
  });

  it('rejects an illegal move (chess.js throws) without advancing state', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start(BASE_CONFIG);
    expect(machine.playMove('e2e5')).toBe('rejected-out-of-book');
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
  });

  it('marks atLineEnd + successOpen when the user plays the last move in a line', () => {
    const driver = buildDriver();
    const machine = createPlayMachine(driver.options);
    // Drill to ply 4 with autoOpponent off so the user controls both sides.
    machine.start({ ...BASE_CONFIG, autoOpponent: false });
    machine.playMove('e2e4');
    machine.playMove('e7e5');
    machine.playMove('g1f3');
    machine.playMove('b8c6');
    machine.playMove('f1c4'); // matches Classical line — atLineEnd
    expect(machine.getSnapshot().atLineEnd).toBe(true);
    expect(machine.getSnapshot().successOpen).toBe(true);
  });

  it('marks successOpen when the opponent\'s reply ends a line (side=black)', () => {
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
    driver.fireNextTimer(); // stale generation → bail
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
  });

  it('reveals book moves and marks manualReveal until the next move', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start(BASE_CONFIG);
    machine.revealBookMoves();
    expect(machine.getSnapshot().manualReveal).toBe(true);
    expect(machine.getSnapshot().outOfBookOpen).toBe(false);
    machine.revealBookMoves(); // idempotent
    expect(machine.getSnapshot().manualReveal).toBe(true);
    machine.playMove('e2e4');
    expect(machine.getSnapshot().manualReveal).toBe(false);
  });

  it('dismissOutOfBook closes the modal and is idempotent', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start(BASE_CONFIG);
    machine.playMove('a2a3');
    expect(machine.getSnapshot().outOfBookOpen).toBe(true);
    machine.dismissOutOfBook();
    expect(machine.getSnapshot().outOfBookOpen).toBe(false);
    machine.dismissOutOfBook();
    expect(machine.getSnapshot().outOfBookOpen).toBe(false);
  });

  it('dismissSuccess closes the success state and is idempotent', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start({ ...BASE_CONFIG, autoOpponent: false });
    machine.playMove('e2e4');
    machine.playMove('e7e5');
    machine.playMove('g1f3');
    machine.playMove('b8c6');
    machine.playMove('f1c4');
    expect(machine.getSnapshot().successOpen).toBe(true);
    machine.dismissSuccess();
    expect(machine.getSnapshot().successOpen).toBe(false);
    machine.dismissSuccess();
    expect(machine.getSnapshot().successOpen).toBe(false);
  });

  it('undo with autoOpponent off pops one ply', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start({ ...BASE_CONFIG, autoOpponent: false });
    machine.playMove('e2e4');
    machine.undo();
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
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

  it('undo is a no-op when there are not enough plies to undo', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start(BASE_CONFIG);
    machine.undo();
    expect(machine.getSnapshot().playedMovesUci).toEqual([]);
  });

  it('setAutoOpponent flips the flag without touching playedMoves', () => {
    const machine = createPlayMachine(buildDriver().options);
    machine.start(BASE_CONFIG);
    machine.setAutoOpponent(false);
    expect(machine.getSnapshot().autoOpponent).toBe(false);
    machine.setAutoOpponent(false); // idempotent
    expect(machine.getSnapshot().autoOpponent).toBe(false);
    machine.setAutoOpponent(true);
    expect(machine.getSnapshot().autoOpponent).toBe(true);
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
