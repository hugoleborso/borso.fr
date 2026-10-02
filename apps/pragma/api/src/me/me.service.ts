import { readCredentialOfMember } from '../auth/credentials.service';
import { readCalendarFeedState } from '../calendar-feeds/calendar-feeds.service';
import type { CalendarFeedState } from '../calendar-feeds/calendar-feeds.types';
import { getMembersSortedByFirstName, patchMember } from '../members/members.service';

export { changePassword } from '../auth/credentials.service';
export { removeCalendarFeed, saveCalendarFeed } from '../calendar-feeds/calendar-feeds.service';
export { SESSION_COOKIE_NAME, SESSION_TTL_MS } from '../auth/session-cookie.utils';
export {
  finishPasskeyRegistration,
  listPasskeys,
  removePasskey,
  startPasskeyRegistration,
} from '../auth/passkey.service';

export interface SignedInMember {
  readonly memberId: string;
  readonly firstName: string;
  readonly color: string;
  readonly username: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly calendarFeed: CalendarFeedState;
}

// @FollowsBlueprint service-orchestration
export async function readSignedInMember(memberId: string): Promise<SignedInMember | null> {
  const [credential, members, calendarFeed] = await Promise.all([
    readCredentialOfMember(memberId),
    getMembersSortedByFirstName(),
    readCalendarFeedState(memberId),
  ]);
  if (credential === null) return null;
  const member = members.find((candidate) => candidate.id === memberId);
  if (member === undefined) return null;
  return {
    memberId,
    firstName: member.firstName,
    color: member.color,
    username: credential.username,
    phone: member.phone,
    email: member.email,
    calendarFeed,
  };
}

export async function saveOwnContactDetails(
  memberId: string,
  contact: { phone?: string | null; email?: string | null },
): Promise<{ kind: 'ok' } | { kind: 'empty' } | { kind: 'not-found' }> {
  const outcome = await patchMember(memberId, contact);
  if (outcome.kind === 'ok') return { kind: 'ok' };
  return outcome;
}
