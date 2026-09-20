import type { RoundStory } from './game-summary.core';

export type RoundSpotlight = 'crateWinner' | 'tariffReceiver' | 'nobody';

export interface SpotlightStyling {
  readonly emphasis: string;
  readonly badgeTone: string;
  readonly labelKey: 'reveal.crateWinner' | 'reveal.tariffReceiver' | null;
  readonly flightAnimation: string;
}

export interface FlyingBanana {
  readonly lanePercent: number;
  readonly delayMilliseconds: number;
}

const NOTHING = 0;
const MOST_BANANAS_IN_FLIGHT = 5;
const FIRST_LANE_PERCENT = 16;
const LANE_SPACING_PERCENT = 15;
const LANE_DELAY_MILLISECONDS = 110;

const SPOTLIGHT_ORDER: Readonly<Record<RoundSpotlight, number>> = {
  crateWinner: 0,
  tariffReceiver: 1,
  nobody: 2,
};

const SPOTLIGHT_STYLING: Readonly<Record<RoundSpotlight, SpotlightStyling>> = {
  crateWinner: {
    emphasis: 'relative z-10 ring-4 ring-peel-deep animate-spotlight-pop',
    badgeTone: 'bg-peel',
    labelKey: 'reveal.crateWinner',
    flightAnimation: 'animate-crate-fall',
  },
  tariffReceiver: {
    emphasis: 'relative z-10 ring-4 ring-leaf animate-spotlight-pop',
    badgeTone: 'bg-leaf-soft',
    labelKey: 'reveal.tariffReceiver',
    flightAnimation: 'animate-tariff-slide',
  },
  nobody: {
    emphasis: 'relative',
    badgeTone: '',
    labelKey: null,
    flightAnimation: '',
  },
};

export function selectRoundSpotlight(story: RoundStory): RoundSpotlight {
  if (story.wonTheCrate) return 'crateWinner';
  if (story.tariffReceived > NOTHING) return 'tariffReceiver';
  return 'nobody';
}

export function sortStoriesBySpotlight(stories: readonly RoundStory[]): readonly RoundStory[] {
  return stories.toSorted(
    (left, right) =>
      SPOTLIGHT_ORDER[selectRoundSpotlight(left)] - SPOTLIGHT_ORDER[selectRoundSpotlight(right)],
  );
}

// @FollowsBlueprint core-label-key
export function selectSpotlightStyling(spotlight: RoundSpotlight): SpotlightStyling {
  return SPOTLIGHT_STYLING[spotlight];
}

export function countBananasInFlight(story: RoundStory, spotlight: RoundSpotlight): number {
  if (spotlight === 'crateWinner') return story.crateWon;
  if (spotlight === 'tariffReceiver') return story.tariffReceived;
  return NOTHING;
}

export function planBananaFlight(bananas: number): readonly FlyingBanana[] {
  const lanes = Math.min(bananas, MOST_BANANAS_IN_FLIGHT);
  return Array.from({ length: lanes }, (_unused, lane) => ({
    lanePercent: FIRST_LANE_PERCENT + lane * LANE_SPACING_PERCENT,
    delayMilliseconds: lane * LANE_DELAY_MILLISECONDS,
  }));
}
