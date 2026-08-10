import { describe, expect, it } from 'vitest';
import {
  formValuesToLineup,
  type LineupEditorMember,
  lineupToFormValues,
  NOT_PLAYING_OPTION_VALUE,
} from './lineup-editor.core';

const MEMBERS: readonly LineupEditorMember[] = [
  { id: 'ada', name: 'Ada', color: '#111111' },
  { id: 'bob', name: 'Bob', color: '#222222' },
];

// @FollowsBlueprint test-pure-unit
describe('lineupToFormValues', () => {
  it('fills a value for every member', () => {
    expect(lineupToFormValues({ ada: 'guitar' }, MEMBERS)).toEqual({
      ada: 'guitar',
      bob: NOT_PLAYING_OPTION_VALUE,
    });
  });

  it('reads an explicit null as not playing', () => {
    expect(lineupToFormValues({ ada: null, bob: null }, MEMBERS)).toEqual({
      ada: NOT_PLAYING_OPTION_VALUE,
      bob: NOT_PLAYING_OPTION_VALUE,
    });
  });
});

describe('formValuesToLineup', () => {
  it('keeps only the members who play something', () => {
    expect(formValuesToLineup({ ada: 'guitar', bob: NOT_PLAYING_OPTION_VALUE })).toEqual({
      ada: 'guitar',
    });
  });

  it('collapses an all-empty selection to null', () => {
    expect(
      formValuesToLineup({ ada: NOT_PLAYING_OPTION_VALUE, bob: NOT_PLAYING_OPTION_VALUE }),
    ).toBeNull();
  });
});
