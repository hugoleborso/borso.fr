/** @Feature sessions */

import { BAND_TIME_ZONE } from '@domain/band-time-zone.core';

const RANGE_SEPARATOR = ' – ';

export type ExclusionReason = 'no-calendar' | 'needs-reconnecting' | 'unavailable';

export interface FormattedFreeSlot {
  readonly day: string;
  readonly hours: string;
}

export interface NamedExclusion {
  readonly firstName: string;
  readonly reason: ExclusionReason;
  readonly calendarName: string | null;
}

const EXCLUSION_MESSAGE_KEY = {
  'no-calendar': 'freeSlots.excluded.noCalendar',
  'needs-reconnecting': 'freeSlots.excluded.needsReconnecting',
  unavailable: 'freeSlots.excluded.unavailable',
} as const;

const NAMED_EXCLUSION_MESSAGE_KEY = {
  'no-calendar': 'freeSlots.excluded.noCalendar',
  'needs-reconnecting': 'freeSlots.excluded.needsReconnectingNamed',
  unavailable: 'freeSlots.excluded.unavailableNamed',
} as const;

export type ExclusionMessageKey =
  | (typeof EXCLUSION_MESSAGE_KEY)[ExclusionReason]
  | (typeof NAMED_EXCLUSION_MESSAGE_KEY)[ExclusionReason];

export function selectExclusionMessageKey(exclusion: NamedExclusion): ExclusionMessageKey {
  return exclusion.calendarName === null
    ? EXCLUSION_MESSAGE_KEY[exclusion.reason]
    : NAMED_EXCLUSION_MESSAGE_KEY[exclusion.reason];
}

interface MemberName {
  readonly id: string;
  readonly firstName: string;
}

const UNKNOWN_MEMBER_NAME = '—';

// @FollowsBlueprint utils-formatter
export function formatFreeSlot(
  startIso: string,
  endIso: string,
  locale: string,
): FormattedFreeSlot {
  const dayFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: BAND_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const hourFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: BAND_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const start = new Date(startIso);
  const end = new Date(endIso);
  return {
    day: dayFormatter.format(start),
    hours: `${hourFormatter.format(start)}${RANGE_SEPARATOR}${hourFormatter.format(end)}`,
  };
}

export function nameExclusions(
  exclusions: readonly {
    readonly memberId: string;
    readonly reason: ExclusionReason;
    readonly calendarName: string | null;
  }[],
  members: readonly MemberName[],
): NamedExclusion[] {
  const firstNameById = new Map(members.map((member) => [member.id, member.firstName]));
  return exclusions.map((exclusion) => ({
    firstName: firstNameById.get(exclusion.memberId) ?? UNKNOWN_MEMBER_NAME,
    reason: exclusion.reason,
    calendarName: exclusion.calendarName,
  }));
}

export type FreeSlotsView = 'loading' | 'no-calendar-at-all' | 'no-slot' | 'slots';

export interface FreeSlotsViewInput {
  readonly isLoaded: boolean;
  readonly slotCount: number;
  readonly exclusions: readonly { readonly reason: ExclusionReason }[];
  readonly memberCount: number;
}

export function selectFreeSlotsView(input: FreeSlotsViewInput): FreeSlotsView {
  if (!input.isLoaded) return 'loading';
  const withoutCalendar = input.exclusions.filter(
    (exclusion) => exclusion.reason === 'no-calendar',
  );
  if (input.memberCount > 0 && withoutCalendar.length === input.memberCount) {
    return 'no-calendar-at-all';
  }
  return input.slotCount === 0 ? 'no-slot' : 'slots';
}
