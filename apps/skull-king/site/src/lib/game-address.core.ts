import { isCompleteJoinCode, normalizeJoinCode } from '@domain/join-code.core';
import type { RoundPhase } from '@domain/round.core';

export const GAME_PARAMETER = 'game';
export const VIEW_PARAMETER = 'view';

const SIDE_VIEWS = ['invite', 'scores'] as const;

export type SideView = (typeof SIDE_VIEWS)[number];
export type GameScreen = SideView | 'bidding' | 'scoring';

const TRAILING_SLASH = /\/$/u;

// @FollowsBlueprint core-address-a-guest-can-open-cold
export function readGameCode(rawParameter: string | null): string | null {
  if (rawParameter === null) return null;
  const code = normalizeJoinCode(rawParameter);
  return isCompleteJoinCode(code) ? code : null;
}

export function readSideView(rawParameter: string | null): SideView | null {
  return SIDE_VIEWS.find((view) => view === rawParameter) ?? null;
}

export function selectGameScreen(phase: RoundPhase, view: SideView | null): GameScreen {
  if (phase === 'finished') return 'scores';
  return view ?? phase;
}

export function buildGameSearch(joinCode: string, view: SideView | null): string {
  const search = new URLSearchParams({ [GAME_PARAMETER]: joinCode });
  if (view !== null) search.set(VIEW_PARAMETER, view);
  return `?${search.toString()}`;
}

export function buildInvitationUrl(origin: string, joinCode: string): string {
  return `${origin.replace(TRAILING_SLASH, '')}/${buildGameSearch(joinCode, null)}`;
}
