export type LatestTextSaveStatus = 'saved' | 'unsaved' | 'saving' | 'failed';

export interface LatestTextSaveState {
  readonly latestText: string;
  readonly savedText: string;
  readonly inFlightText: string | null;
  readonly hasFailed: boolean;
}

export type LatestTextSaveEvent =
  | { readonly kind: 'typed'; readonly text: string }
  | { readonly kind: 'saveStarted'; readonly text: string }
  | { readonly kind: 'saveSucceeded' }
  | { readonly kind: 'saveFailed' };

// @FollowsBlueprint utils-pure-module
export function buildLatestTextSaveState(savedText: string): LatestTextSaveState {
  return { latestText: savedText, savedText, inFlightText: null, hasFailed: false };
}

export function reduceLatestTextSave(
  state: LatestTextSaveState,
  event: LatestTextSaveEvent,
): LatestTextSaveState {
  switch (event.kind) {
    case 'typed':
      return { ...state, latestText: event.text };
    case 'saveStarted':
      return { ...state, inFlightText: event.text, hasFailed: false };
    case 'saveSucceeded':
      return { ...state, savedText: state.inFlightText ?? state.savedText, inFlightText: null };
    case 'saveFailed':
      return { ...state, inFlightText: null, hasFailed: true };
  }
}

export function planNextSave(state: LatestTextSaveState): string | null {
  if (state.inFlightText !== null) return null;
  return state.latestText === state.savedText ? null : state.latestText;
}

export function selectLatestTextSaveStatus(state: LatestTextSaveState): LatestTextSaveStatus {
  if (state.inFlightText !== null) return 'saving';
  if (state.hasFailed) return 'failed';
  return state.latestText === state.savedText ? 'saved' : 'unsaved';
}

export type TextSaveDisplay = 'none' | 'saving' | 'saved' | 'failed';

export function selectTextSaveDisplay(
  status: LatestTextSaveStatus,
  hasTyped: boolean,
): TextSaveDisplay {
  if (status === 'failed' || status === 'saving') return status;
  return status === 'saved' && hasTyped ? 'saved' : 'none';
}
