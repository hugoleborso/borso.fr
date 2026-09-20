export const MINIMUM_SEATS = 2;
export const MAXIMUM_SEATS = 8;
export const STARTING_STASH_BANANAS = 10;
export const STARTING_CRATE_BANANAS = 10;

const SHORT_GAME_SCORE = 100;
const STANDARD_GAME_SCORE = 200;
const LONG_GAME_SCORE = 500;
export const FLASH_ROUND_SECONDS = 5;
export const QUICK_ROUND_SECONDS = 10;
export const SNAPPY_ROUND_SECONDS = 15;
export const BRISK_ROUND_SECONDS = 30;
export const RELAXED_ROUND_SECONDS = 60;

export const WINNING_SCORE_CHOICES = [
  SHORT_GAME_SCORE,
  STANDARD_GAME_SCORE,
  LONG_GAME_SCORE,
] as const;
export const ROUND_TIMER_CHOICES_SECONDS = [
  FLASH_ROUND_SECONDS,
  QUICK_ROUND_SECONDS,
  SNAPPY_ROUND_SECONDS,
  BRISK_ROUND_SECONDS,
  RELAXED_ROUND_SECONDS,
] as const;

export type WinningScore = (typeof WINNING_SCORE_CHOICES)[number];
export type RoundTimerSeconds = (typeof ROUND_TIMER_CHOICES_SECONDS)[number];

export type GameSetupRefusal = 'seats-out-of-range' | 'unknown-winning-score' | 'unknown-timer';

export interface GameSetup {
  readonly maxPlayers: number;
  readonly winningScore: number;
  readonly roundTimerSeconds: number | null;
}

function isKnownWinningScore(score: number): boolean {
  return WINNING_SCORE_CHOICES.some((choice) => choice === score);
}

function isKnownRoundTimer(seconds: number | null): boolean {
  if (seconds === null) return true;
  return ROUND_TIMER_CHOICES_SECONDS.some((choice) => choice === seconds);
}

// @FollowsBlueprint domain-shared-selection
export function refuseGameSetup(setup: GameSetup): GameSetupRefusal | null {
  const isSeatsAreWhole = Number.isInteger(setup.maxPlayers);
  const isSeatsInRange = setup.maxPlayers >= MINIMUM_SEATS && setup.maxPlayers <= MAXIMUM_SEATS;
  if (!isSeatsAreWhole || !isSeatsInRange) return 'seats-out-of-range';
  if (!isKnownWinningScore(setup.winningScore)) return 'unknown-winning-score';
  if (!isKnownRoundTimer(setup.roundTimerSeconds)) return 'unknown-timer';
  return null;
}
