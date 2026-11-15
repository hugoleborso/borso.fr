import type { CalendarDay } from '@domain/paris-day.core';
import type { BandFlame, PersonalFlame } from '@domain/practice-flame.core';

// @FollowsBlueprint domain-types-module
export interface StreaksView {
  readonly today: CalendarDay;
  readonly mine: PersonalFlame;
  readonly band: BandFlame;
}
