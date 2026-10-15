/** @Feature studies */

import { useTranslation } from 'react-i18next';
import { StreakBadge } from '../molecules/StreakBadge';

export interface BandStreaksProps {
  members: readonly {
    memberId: string;
    firstName: string;
    color: string;
    studiesThisWeek: number;
    streak: { days: number; isTodayCounted: boolean; isJokerAvailable: boolean };
  }[];
}

// @FollowsBlueprint organism-presentational
export function BandStreaks({ members }: BandStreaksProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <ul className="m-0 p-0 list-none flex flex-col gap-2" data-testid="band-streaks">
      {members.map((member) => (
        <li
          key={member.memberId}
          className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-line"
        >
          <span className="flex items-center gap-2 min-w-0">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: member.color }}
              aria-hidden="true"
            />
            <span className="text-sm text-ink-900 truncate">{member.firstName}</span>
          </span>
          <span className="flex items-center gap-3">
            <span className="text-xs text-ink-500">
              {t('studies.thisWeek', { count: member.studiesThisWeek })}
            </span>
            <StreakBadge {...member.streak} />
          </span>
        </li>
      ))}
    </ul>
  );
}
