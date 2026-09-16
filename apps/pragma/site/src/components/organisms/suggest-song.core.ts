/** @Feature audience-voting */

export type SuggestionMessageKey =
  | 'audience.searchUnavailable'
  | 'audience.suggestFailed'
  | 'audience.suggestHint'
  | 'audience.searchNoResults'
  | 'common.loading';

export interface SuggestionOutcome {
  readonly messageKey: SuggestionMessageKey | null;
  readonly isFailure: boolean;
}

export interface SelectSuggestionOutcomeParams {
  readonly query: string;
  readonly isSearching: boolean;
  readonly searchError: unknown;
  readonly hitCount: number;
  readonly writeError: unknown;
}

const SEARCHING: SuggestionOutcome = { messageKey: 'common.loading', isFailure: false };
const SEARCH_UNAVAILABLE: SuggestionOutcome = {
  messageKey: 'audience.searchUnavailable',
  isFailure: true,
};
const WRITE_FAILED: SuggestionOutcome = { messageKey: 'audience.suggestFailed', isFailure: true };
const NOTHING_FOUND: SuggestionOutcome = {
  messageKey: 'audience.searchNoResults',
  isFailure: false,
};
const HINT: SuggestionOutcome = { messageKey: 'audience.suggestHint', isFailure: false };
const RESULTS_SPEAK_FOR_THEMSELVES: SuggestionOutcome = { messageKey: null, isFailure: false };

/**
 * @Blueprint core-message-selection
 * @BlueprintName Core Choosing The One Message A Screen Shows
 * @BlueprintUsage Use where several failures and several waits could each put a line on the screen and only one of them may.
 * @BlueprintDescription Takes the raw query state as plain fields and returns one translation key with whether it reads as a failure, so the component holds no chain of conditionals and the precedence between "the search was refused" and "nothing was found" is pinned by a test rather than by the order two JSX blocks happen to sit in. A refused search must never fall through to the empty-result line, which is the defect this exists to stop.
 */
export function selectSuggestionOutcome(params: SelectSuggestionOutcomeParams): SuggestionOutcome {
  if (params.writeError !== null && params.writeError !== undefined) return WRITE_FAILED;
  if (params.searchError !== null && params.searchError !== undefined) return SEARCH_UNAVAILABLE;
  if (params.isSearching) return SEARCHING;
  if (params.query.length === 0) return HINT;
  if (params.hitCount === 0) return NOTHING_FOUND;
  return RESULTS_SPEAK_FOR_THEMSELVES;
}
