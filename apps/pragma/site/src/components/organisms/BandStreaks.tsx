/** @Feature studies */

import { useTranslation } from 'react-i18next';
import { MemberMark } from '../atoms/MemberMark';
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
          className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-rule"
        >
          <span className="flex items-center gap-2 min-w-0">
            <MemberMark color={member.color} shape="dot" />
            <span className="text-meta text-ink truncate">{member.firstName}</span>
          </span>
          <span className="flex items-center gap-3">
            <span className="text-meta text-ink-soft">
              {t('studies.thisWeek', { count: member.studiesThisWeek })}
            </span>
            <StreakBadge {...member.streak} />
          </span>
        </li>
      ))}
    </ul>
  );
}
