import { useTranslation } from 'react-i18next';
import { Select } from '@/components/atoms/Select';
import {
  listOpponentStrengthSteps,
  type OpponentStrengthId,
  toOpponentStrengthId,
} from '@/opponent/opponent-strength.core';
import { setOpponentStrength } from '@/state/appState';

const STEP_KEY_BY_STRENGTH = {
  'skill-0': 'opponent.strength.steps.skill-0',
  'skill-3': 'opponent.strength.steps.skill-3',
  'skill-6': 'opponent.strength.steps.skill-6',
  'elo-1320': 'opponent.strength.steps.elo-1320',
  'elo-1500': 'opponent.strength.steps.elo-1500',
  'elo-1700': 'opponent.strength.steps.elo-1700',
  'elo-1900': 'opponent.strength.steps.elo-1900',
  'elo-2000': 'opponent.strength.steps.elo-2000',
  'elo-2200': 'opponent.strength.steps.elo-2200',
  'elo-2500': 'opponent.strength.steps.elo-2500',
} as const satisfies Record<OpponentStrengthId, string>;

interface OpponentStrengthSelectProps {
  strength: OpponentStrengthId;
}

// @FollowsBlueprint molecule-presentational
export function OpponentStrengthSelect({ strength }: OpponentStrengthSelectProps) {
  const { t } = useTranslation();
  const label = t('opponent.strength.label');
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span>{label}</span>
      <Select
        value={strength}
        ariaLabel={label}
        options={listOpponentStrengthSteps().map((step) => ({
          value: step.id,
          label: t(STEP_KEY_BY_STRENGTH[step.id]),
        }))}
        onSelect={(value) => setOpponentStrength(toOpponentStrengthId(value, strength))}
      />
    </div>
  );
}
