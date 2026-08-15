import type { Challenge } from '../../labours/labours.types';
import { selectFilmstripBarColor } from '../../labours/labours-appearance.core';

interface ChallengeBarStripProps {
  challenges: readonly Challenge[];
  isActive: boolean;
}

// @FollowsBlueprint atom-plain
export function ChallengeBarStrip({ challenges, isActive }: ChallengeBarStripProps) {
  return (
    <div className="mb-2 flex gap-[3px]">
      {challenges.map((challenge) => (
        <div
          key={challenge.titleKey}
          className="h-[3px] flex-1"
          style={{ background: selectFilmstripBarColor(challenge.status, isActive) }}
        />
      ))}
    </div>
  );
}
