export type OpponentStrengthFamily = 'skill-level' | 'rating';

export type OpponentStrengthId =
  | 'skill-0'
  | 'skill-3'
  | 'skill-6'
  | 'elo-1320'
  | 'elo-1500'
  | 'elo-1700'
  | 'elo-1900'
  | 'elo-2000'
  | 'elo-2200'
  | 'elo-2500';

export interface OpponentStrengthStep {
  id: OpponentStrengthId;
  family: OpponentStrengthFamily;
  level: number;
}

// @FollowsBlueprint core-lookup-table
const OPPONENT_STRENGTH_STEPS = {
  'skill-0': { id: 'skill-0', family: 'skill-level', level: 0 },
  'skill-3': { id: 'skill-3', family: 'skill-level', level: 3 },
  'skill-6': { id: 'skill-6', family: 'skill-level', level: 6 },
  'elo-1320': { id: 'elo-1320', family: 'rating', level: 1320 },
  'elo-1500': { id: 'elo-1500', family: 'rating', level: 1500 },
  'elo-1700': { id: 'elo-1700', family: 'rating', level: 1700 },
  'elo-1900': { id: 'elo-1900', family: 'rating', level: 1900 },
  'elo-2000': { id: 'elo-2000', family: 'rating', level: 2000 },
  'elo-2200': { id: 'elo-2200', family: 'rating', level: 2200 },
  'elo-2500': { id: 'elo-2500', family: 'rating', level: 2500 },
} as const satisfies Record<OpponentStrengthId, OpponentStrengthStep>;

const OPPONENT_STRENGTH_ORDER: readonly OpponentStrengthId[] = [
  'skill-0',
  'skill-3',
  'skill-6',
  'elo-1320',
  'elo-1500',
  'elo-1700',
  'elo-1900',
  'elo-2000',
  'elo-2200',
  'elo-2500',
];

export const DEFAULT_OPPONENT_STRENGTH: OpponentStrengthId = 'elo-2000';

const LIMIT_STRENGTH_BY_FAMILY = {
  'skill-level': 'false',
  rating: 'true',
} as const satisfies Record<OpponentStrengthFamily, string>;

const LEVEL_OPTION_BY_FAMILY = {
  'skill-level': 'Skill Level',
  rating: 'UCI_Elo',
} as const satisfies Record<OpponentStrengthFamily, string>;

export function listOpponentStrengthSteps(): OpponentStrengthStep[] {
  return OPPONENT_STRENGTH_ORDER.map((id) => OPPONENT_STRENGTH_STEPS[id]);
}

export function isOpponentStrengthId(value: unknown): value is OpponentStrengthId {
  return OPPONENT_STRENGTH_ORDER.some((id) => id === value);
}

export function toOpponentStrengthId(
  value: string,
  current: OpponentStrengthId,
): OpponentStrengthId {
  return isOpponentStrengthId(value) ? value : current;
}

export function listStrengthCommands(id: OpponentStrengthId): string[] {
  const step = OPPONENT_STRENGTH_STEPS[id];
  return [
    `setoption name UCI_LimitStrength value ${LIMIT_STRENGTH_BY_FAMILY[step.family]}`,
    `setoption name ${LEVEL_OPTION_BY_FAMILY[step.family]} value ${step.level}`,
  ];
}
