/** @Feature streaks */

import { JOKERS_PER_WEEK } from '@domain/practice-flame.core';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { StreaksView } from '../../lib/queries/streaks.queries';
import { BlazeMark } from '../atoms/BlazeMark';
import { MemberMark } from '../atoms/MemberMark';
import { FlameHero } from '../molecules/FlameHero';
import { FlameWeek } from '../molecules/FlameWeek';
import { buildJokerPips, buildWeekCells } from '../molecules/flame-week.core';
import { selectFlameTone } from '../molecules/flame-tone.core';
import { JokersCard } from '../molecules/JokersCard';
import { Sheet } from '../molecules/Sheet';
import { sortMembersByFlame } from './streak-sheet.core';

export interface StreakSheetProps {
  readonly view: StreaksView;
  readonly onClose: () => void;
}

// @FollowsBlueprint organism-presentational
export function StreakSheet({ view, onClose }: StreakSheetProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const title = t('streaks.sheetTitle');
  const jokersLeft = view.mine.jokersLeftThisWeek;
  return (
    <Sheet title={title} label={title} onClose={onClose}>
      <div className="flex flex-col gap-4 pb-2">
        <FlameHero scope="personal" tone={selectFlameTone(view.mine)} days={view.mine.days} />
        <FlameWeek cells={buildWeekCells(view.mine.week, view.today, i18n.language)} />
        <JokersCard
          pips={buildJokerPips(view.mine.week, jokersLeft, i18n.language)}
          jokersLeft={jokersLeft}
          jokersPerWeek={JOKERS_PER_WEEK}
        />
        <hr className="m-0 border-0 border-t border-rule" />
        <FlameHero scope="band" tone={selectFlameTone(view.band)} days={view.band.days} />
        <ul className="m-0 flex list-none flex-col p-0">
          {sortMembersByFlame(view.members).map((member) => (
            <li key={member.memberId} className="flex min-h-11 items-center gap-3">
              <MemberMark shape="dot" color={member.color} />
              <span className="min-w-0 truncate text-body text-ink">{member.firstName}</span>
              <span className="min-w-0 flex-auto truncate text-meta text-ink-soft">
                {member.flame.isTodayCounted ? null : t('streaks.todayOpen')}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-meta font-semibold text-ink tabular-nums">
                <BlazeMark tone={selectFlameTone(member.flame)} size="sm" />
                <span aria-hidden="true">{member.flame.days}</span>
                <span className="sr-only">{t('streaks.days', { count: member.flame.days })}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
