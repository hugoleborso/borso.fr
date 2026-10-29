import type { CalendarDay } from '@domain/paris-day.core';
import type { BandFlame, PersonalFlame } from '@domain/practice-flame.core';

// @FollowsBlueprint domain-types-module
export interface MemberFlame {
  readonly memberId: string;
  readonly firstName: string;
  readonly color: string;
  readonly flame: PersonalFlame;
}

export interface StreaksView {
  readonly today: CalendarDay;
  readonly mine: PersonalFlame;
  readonly band: BandFlame;
  readonly members: readonly MemberFlame[];
}
