export type AppTab = 'today' | 'decks' | 'stats' | 'explore';

export type AppScreen =
  | { kind: 'today' }
  | { kind: 'review-session'; deckId: string | null }
  | { kind: 'decks' }
  | { kind: 'deck'; deckId: string }
  | { kind: 'stats' }
  | { kind: 'explore' }
  | { kind: 'credits' };

export type AppScreenKind = AppScreen['kind'];

export const APP_TABS: readonly AppTab[] = ['today', 'decks', 'stats', 'explore'];
export const INITIAL_SCREEN: AppScreen = { kind: 'today' };

const TAB_BY_SCREEN_KIND: Record<Exclude<AppScreenKind, 'review-session'>, AppTab | null> = {
  today: 'today',
  decks: 'decks',
  deck: 'decks',
  stats: 'stats',
  explore: 'explore',
  credits: null,
};

const SCREEN_BY_TAB: Record<AppTab, AppScreen> = {
  today: { kind: 'today' },
  decks: { kind: 'decks' },
  stats: { kind: 'stats' },
  explore: { kind: 'explore' },
};

// @FollowsBlueprint core-view-intent
export function selectActiveTab(screen: AppScreen): AppTab | null {
  if (screen.kind === 'review-session') return screen.deckId === null ? 'today' : 'decks';
  return TAB_BY_SCREEN_KIND[screen.kind];
}

export function selectTabScreen(tab: AppTab): AppScreen {
  return SCREEN_BY_TAB[tab];
}

export function selectSessionExitScreen(deckId: string | null): AppScreen {
  return deckId === null ? { kind: 'today' } : { kind: 'deck', deckId };
}

export function readScreenDeckId(screen: AppScreen): string | null {
  return 'deckId' in screen ? screen.deckId : null;
}

export type AppScreenView = AppScreenKind | 'decks-load-failure';

const KINDS_THAT_READ_DECKS: ReadonlySet<AppScreenKind> = new Set([
  'today',
  'review-session',
  'decks',
  'deck',
  'stats',
]);

export function selectAppScreenView(
  screen: AppScreen,
  areDecksLoaded: boolean,
  deckIds: readonly string[],
): AppScreenView {
  if (!areDecksLoaded && KINDS_THAT_READ_DECKS.has(screen.kind)) return 'decks-load-failure';
  if (screen.kind === 'deck' && !deckIds.includes(screen.deckId)) return 'decks';
  return screen.kind;
}

const KINDS_WITH_ROOM_FOR_A_BAND: ReadonlySet<AppScreenKind> = new Set([
  'today',
  'decks',
  'stats',
  'credits',
]);

export function hasRoomForABand(screen: AppScreen): boolean {
  return KINDS_WITH_ROOM_FOR_A_BAND.has(screen.kind);
}
