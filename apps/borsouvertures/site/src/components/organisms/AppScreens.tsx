import { use } from 'react';
import { DecksLoadFailurePanel } from '@/components/molecules/DecksLoadFailurePanel';
import { readDecksRequest } from '@/decks/decks-resource.setup';
import type { ComponentByKind } from '@/lib/componentTable.types';
import {
  type AppScreenView,
  readScreenDeckId,
  selectAppScreenView,
} from '@/navigation/app-screen.core';
import { useAppScreen } from '@/navigation/navigation.store';
import { CreditsScreen } from './CreditsScreen';
import { DeckPage } from './DeckPage';
import { DecksScreen } from './DecksScreen';
import { ExploreScreen } from './ExploreScreen';
import { ReviewSession } from './ReviewSession';
import type { AppScreenProps } from './screen.types';
import { TodayScreen } from './TodayScreen';

const SCREEN_BY_VIEW: ComponentByKind<AppScreenView, AppScreenProps> = {
  today: TodayScreen,
  'review-session': ReviewSession,
  decks: DecksScreen,
  deck: DeckPage,
  explore: ExploreScreen,
  credits: CreditsScreen,
  'decks-load-failure': DecksLoadFailurePanel,
};

// @FollowsBlueprint component-lookup-table
export function AppScreens() {
  const load = use(readDecksRequest());
  const screen = useAppScreen();
  const view = selectAppScreenView(
    screen,
    load.status === 'loaded',
    load.decks.map((deck) => deck.id),
  );
  const Screen = SCREEN_BY_VIEW[view];
  return <Screen decks={load.decks} deckId={readScreenDeckId(screen)} />;
}
