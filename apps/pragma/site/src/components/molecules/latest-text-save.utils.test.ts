import { describe, expect, it } from 'vitest';
import {
  isInFlightSaveSuperseded,
  buildLatestTextSaveState,
  type LatestTextSaveEvent,
  type LatestTextSaveState,
  planNextSave,
  reduceLatestTextSave,
  selectTextSaveDisplay,
  selectLatestTextSaveStatus,
} from './latest-text-save.utils';

function replay(
  events: readonly LatestTextSaveEvent[],
  start = buildLatestTextSaveState(''),
): LatestTextSaveState {
  return events.reduce(reduceLatestTextSave, start);
}

describe('buildLatestTextSaveState', () => {
  it('starts saved on the text the server holds', () => {
    const state = buildLatestTextSaveState('Finir sur le refrain');
    expect(state).toEqual({
      latestText: 'Finir sur le refrain',
      savedText: 'Finir sur le refrain',
      inFlightText: null,
      hasFailed: false,
    });
    expect(selectLatestTextSaveStatus(state)).toBe('saved');
    expect(planNextSave(state)).toBeNull();
  });
});

describe('planNextSave', () => {
  it('sends the latest text once it differs from the saved one', () => {
    const state = replay([
      { kind: 'typed', text: 'F' },
      { kind: 'typed', text: 'Fi' },
    ]);
    expect(planNextSave(state)).toBe('Fi');
    expect(selectLatestTextSaveStatus(state)).toBe('unsaved');
  });

  it('sends nothing while a save is in flight', () => {
    const state = replay([
      { kind: 'typed', text: 'Fi' },
      { kind: 'saveStarted', text: 'Fi' },
      { kind: 'typed', text: 'Fin' },
    ]);
    expect(planNextSave(state)).toBeNull();
    expect(selectLatestTextSaveStatus(state)).toBe('saving');
  });

  it('sends the newer text when the older save settles', () => {
    const state = replay([
      { kind: 'typed', text: 'Fi' },
      { kind: 'saveStarted', text: 'Fi' },
      { kind: 'typed', text: 'Finir' },
      { kind: 'saveSucceeded' },
    ]);
    expect(state.savedText).toBe('Fi');
    expect(planNextSave(state)).toBe('Finir');
  });

  it('sends nothing when the text typed back equals the saved one', () => {
    const state = replay([
      { kind: 'typed', text: 'Fi' },
      { kind: 'saveStarted', text: 'Fi' },
      { kind: 'saveSucceeded' },
      { kind: 'typed', text: 'Fin' },
      { kind: 'typed', text: 'Fi' },
    ]);
    expect(planNextSave(state)).toBeNull();
    expect(selectLatestTextSaveStatus(state)).toBe('saved');
  });
});

describe('a failed save', () => {
  it('keeps the text, reports the failure and offers the text again', () => {
    const state = replay([
      { kind: 'typed', text: 'Fi' },
      { kind: 'saveStarted', text: 'Fi' },
      { kind: 'saveFailed' },
    ]);
    expect(state.latestText).toBe('Fi');
    expect(state.savedText).toBe('');
    expect(selectLatestTextSaveStatus(state)).toBe('failed');
    expect(planNextSave(state)).toBe('Fi');
  });

  it('clears the failure on the next attempt', () => {
    const state = replay([
      { kind: 'typed', text: 'Fi' },
      { kind: 'saveStarted', text: 'Fi' },
      { kind: 'saveFailed' },
      { kind: 'saveStarted', text: 'Fi' },
    ]);
    expect(state.hasFailed).toBe(false);
  });
});

describe('a success with nothing in flight', () => {
  it('keeps the saved text', () => {
    expect(replay([{ kind: 'saveSucceeded' }], buildLatestTextSaveState('a')).savedText).toBe('a');
  });
});

describe('selectTextSaveDisplay', () => {
  it('shows a failure and a save in flight whatever was typed', () => {
    expect(selectTextSaveDisplay('failed', false)).toBe('failed');
    expect(selectTextSaveDisplay('saving', false)).toBe('saving');
  });

  it('says Saved only once the person typed', () => {
    expect(selectTextSaveDisplay('saved', true)).toBe('saved');
    expect(selectTextSaveDisplay('saved', false)).toBe('none');
  });

  it('says nothing while the pause before a save runs', () => {
    expect(selectTextSaveDisplay('unsaved', true)).toBe('none');
  });
});

describe('isInFlightSaveSuperseded', () => {
  it('is false with nothing in flight', () => {
    expect(isInFlightSaveSuperseded(buildLatestTextSaveState('Intro'))).toBe(false);
  });

  it('is false while the text in flight is still the latest', () => {
    const state = reduceLatestTextSave(
      reduceLatestTextSave(buildLatestTextSaveState(''), { kind: 'typed', text: 'Intro' }),
      { kind: 'saveStarted', text: 'Intro' },
    );
    expect(isInFlightSaveSuperseded(state)).toBe(false);
  });

  it('is true once newer text was typed behind the save in flight', () => {
    const inFlight = reduceLatestTextSave(buildLatestTextSaveState(''), {
      kind: 'saveStarted',
      text: 'Intro',
    });
    const state = reduceLatestTextSave(inFlight, { kind: 'typed', text: 'Intro long' });
    expect(isInFlightSaveSuperseded(state)).toBe(true);
  });
});
