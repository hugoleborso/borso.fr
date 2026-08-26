import { describe, expect, it } from 'vitest';
import { selectSuggestionOutcome } from './suggest-song.core';

const QUIET = {
  query: '',
  isSearching: false,
  searchError: null,
  hitCount: 0,
  writeError: null,
};

// @FollowsBlueprint test-pure-unit
describe('choosing the one line the suggestion field shows', () => {
  it('invites the visitor to type before anything has been searched', () => {
    expect(selectSuggestionOutcome(QUIET)).toEqual({
      messageKey: 'audience.suggestHint',
      isFailure: false,
    });
  });

  it('says it is looking while the search is in flight', () => {
    expect(selectSuggestionOutcome({ ...QUIET, query: 'lucky', isSearching: true })).toEqual({
      messageKey: 'common.loading',
      isFailure: false,
    });
  });

  it('states the search was refused rather than showing an empty result list', () => {
    const outcome = selectSuggestionOutcome({
      ...QUIET,
      query: 'lucky',
      searchError: new Error('search 503'),
    });
    expect(outcome).toEqual({ messageKey: 'audience.searchUnavailable', isFailure: true });
  });

  it('states a refused search even while the retry is in flight', () => {
    const outcome = selectSuggestionOutcome({
      ...QUIET,
      query: 'lucky',
      isSearching: true,
      searchError: new Error('search 503'),
    });
    expect(outcome.messageKey).toBe('audience.searchUnavailable');
  });

  it('says nothing was found only when the search actually answered', () => {
    expect(selectSuggestionOutcome({ ...QUIET, query: 'lucky' })).toEqual({
      messageKey: 'audience.searchNoResults',
      isFailure: false,
    });
  });

  it('shows no line at all once there are results to read', () => {
    expect(selectSuggestionOutcome({ ...QUIET, query: 'lucky', hitCount: 3 })).toEqual({
      messageKey: null,
      isFailure: false,
    });
  });

  it('puts a refused suggestion above every other line', () => {
    const outcome = selectSuggestionOutcome({
      ...QUIET,
      query: 'lucky',
      hitCount: 3,
      writeError: new Error('suggest 409'),
    });
    expect(outcome).toEqual({ messageKey: 'audience.suggestFailed', isFailure: true });
  });

  it('reads an absent error the same way whether it is null or undefined', () => {
    expect(
      selectSuggestionOutcome({ ...QUIET, searchError: undefined, writeError: undefined }),
    ).toEqual({ messageKey: 'audience.suggestHint', isFailure: false });
  });
});
