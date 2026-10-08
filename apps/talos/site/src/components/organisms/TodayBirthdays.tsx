import type { JSX } from 'react';
import { Card } from '../atoms/Card';
import { BirthdayList, type BirthdayListProps } from './BirthdayList';

// @FollowsBlueprint organism-presentational
export function TodayBirthdays({ birthdays }: BirthdayListProps): JSX.Element | null {
  if (birthdays.length === 0) return null;
  return (
    <Card padding="none" className="px-1">
      <BirthdayList birthdays={birthdays} />
    </Card>
  );
}
