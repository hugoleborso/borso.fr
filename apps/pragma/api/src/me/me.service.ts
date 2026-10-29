import { readCredentialOfMember } from '../auth/credentials.service';
import { readCalendarFeedState } from '../calendar-feeds/calendar-feeds.service';
import type { CalendarFeedState } from '../calendar-feeds/calendar-feeds.types';
import { getMembersSortedByFirstName, patchMember } from '../members/members.service';
import { confirmUpdate, type ToolActor } from '../mcp/mcp.service';
import {
  describeOwnLine,
  readStudiesOverviewForTool,
  writeStudyForTool,
} from '../studies/studies.service';

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

interface StudyToolEntry {
  readonly song: string;
  readonly instrument: string;
  readonly undo?: boolean;
}

export type OwnStudyLine = ReturnType<typeof describeOwnLine>;

export type MeToolUpdateOutcome =
  | {
      readonly kind: 'ok';
      readonly id: string;
      readonly updated: readonly string[];
      readonly study?: OwnStudyLine;
    }
  | { readonly kind: 'refused'; readonly error: string };

export async function readMeForTool(memberId: string, now: Date) {
  const [member, studies] = await Promise.all([
    readSignedInMember(memberId),
    readStudiesOverviewForTool(memberId, now),
  ]);
  if (member === null) return null;
  return { ...member, studies };
}

async function logOwnStudy(
  actor: ToolActor,
  study: StudyToolEntry,
): Promise<OwnStudyLine | { readonly error: string }> {
  const outcome = await writeStudyForTool({
    songReference: study.song,
    instrumentReference: study.instrument,
    isUndoing: study.undo === true,
    memberId: actor.memberId,
    now: actor.now,
  });
  if (outcome.kind !== 'ok') return { error: outcome.kind };
  return describeOwnLine(outcome.myLine);
}

// @FollowsBlueprint service-orchestration
export async function updateMeForTool(
  actor: ToolActor,
  contact: ContactChanges,
  study: StudyToolEntry | undefined,
): Promise<MeToolUpdateOutcome> {
  const { updated } = confirmUpdate(actor.memberId, contact);
  if (updated.length === 0 && study === undefined)
    return { kind: 'refused', error: 'empty-update' };
  const line = study === undefined ? undefined : await logOwnStudy(actor, study);
  if (line !== undefined && 'error' in line) return { kind: 'refused', error: line.error };
  if (updated.length > 0) {
    const saved = await saveOwnContactDetails(actor.memberId, contact);
    if (saved.kind !== 'ok') return { kind: 'refused', error: 'unknown-member' };
  }
  return { kind: 'ok', id: actor.memberId, updated, study: line };
}
