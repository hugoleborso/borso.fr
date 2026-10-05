import { toIsoDay } from '../../lib/calendar-day.utils';

const MINIMUM_PASSKEY_COUNT = 1;

// @FollowsBlueprint core-view-intent
export function canRemovePasskey(passkeyCount: number): boolean {
  return passkeyCount > MINIMUM_PASSKEY_COUNT;
}

export function isLastPasskey(passkeyCount: number | undefined): boolean {
  return passkeyCount === MINIMUM_PASSKEY_COUNT;
}

export function toLocalIsoDay(instant: string): string {
  return toIsoDay(new Date(instant));
}
