import { readCredentialOfMember } from '../auth/credentials.service';
import { listCalendarFeeds } from '../calendar-feeds/calendar-feeds.service';
import type { CalendarFeedSummary } from '../calendar-feeds/calendar-feeds.types';
import { getMembersSortedByFirstName, patchMember } from '../members/members.service';
import { confirmUpdate, type ToolActor } from '../mcp/mcp.service';
import { projectStreaksForTool } from '../streaks/streaks.core';
import { readStreaks } from '../streaks/streaks.service';
import { readStudiesOverviewForTool } from '../studies/studies.service';

export { changePassword } from '../auth/credentials.service';
export { removeCalendarFeed, saveCalendarFeed } from '../calendar-feeds/calendar-feeds.service';
export { SESSION_COOKIE_NAME, SESSION_TTL_MS } from '../auth/session-cookie.utils';
export {
  finishPasskeyRegistration,
  listPasskeys,
  removePasskey,
  renamePasskey,
  startPasskeyRegistration,
} from '../auth/passkey.service';

export interface SignedInMember {
  readonly memberId: string;
  readonly firstName: string;
  readonly color: string;
  readonly username: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly calendarFeeds: readonly CalendarFeedSummary[];
}

// @FollowsBlueprint service-orchestration
export async function readSignedInMember(memberId: string): Promise<SignedInMember | null> {
  const [credential, members, calendarFeeds] = await Promise.all([
    readCredentialOfMember(memberId),
    getMembersSortedByFirstName(),
    listCalendarFeeds(memberId),
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
    calendarFeeds,
  };
}

export async function saveOwnContactDetails(
  memberId: string,
  contact: { phone?: string | null; email?: string | null },
): Promise<{ kind: 'ok'; member: SignedInMember } | { kind: 'empty' } | { kind: 'not-found' }> {
  const outcome = await patchMember(memberId, contact);
  if (outcome.kind !== 'ok') return outcome;
  const member = await readSignedInMember(memberId);
  if (member === null) return { kind: 'not-found' };
  return { kind: 'ok', member };
}

export { defineTool } from '../mcp/mcp.service';

interface ContactChanges {
  readonly phone?: string | null;
  readonly email?: string | null;
}

export type MeToolUpdateOutcome =
  | {
      readonly kind: 'ok';
      readonly id: string;
      readonly updated: readonly string[];
    }
  | { readonly kind: 'refused'; readonly error: string };

export async function readMeForTool(memberId: string, now: Date) {
  const [member, studies, streaks] = await Promise.all([
    readSignedInMember(memberId),
    readStudiesOverviewForTool(memberId, now),
    readStreaks(now),
  ]);
  if (member === null) return null;
  return { ...member, studies, flames: projectStreaksForTool(streaks) };
}

// @FollowsBlueprint service-orchestration
export async function updateMeForTool(
  actor: ToolActor,
  contact: ContactChanges,
): Promise<MeToolUpdateOutcome> {
  const { updated } = confirmUpdate(actor.memberId, contact);
  if (updated.length === 0) return { kind: 'refused', error: 'empty-update' };
  const saved = await saveOwnContactDetails(actor.memberId, contact);
  if (saved.kind !== 'ok') return { kind: 'refused', error: 'unknown-member' };
  return { kind: 'ok', id: actor.memberId, updated };
}
