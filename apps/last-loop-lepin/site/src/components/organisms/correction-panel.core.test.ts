import { describe, expect, it } from 'vitest';
import { selectPunchTone, selectToggledRunner } from './correction-panel.core';

describe('selectToggledRunner', () => {
  it('opens a runner when nothing is open', () => {
    expect(selectToggledRunner(null, 'alice')).toBe('alice');
  });

  it('closes the runner that is already open', () => {
    expect(selectToggledRunner('alice', 'alice')).toBeNull();
  });

  it('moves the open row to another runner', () => {
    expect(selectToggledRunner('alice', 'bob')).toBe('bob');
  });
});

describe('selectPunchTone', () => {
  it('reads a live punch as still counting', () => {
    expect(selectPunchTone(null)).toBe('in-race');
  });

  it('reads a cancelled punch as out', () => {
    expect(selectPunchTone('2026-06-13T05:10:00.000Z')).toBe('out');
  });
});
