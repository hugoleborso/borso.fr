import { readCredentialOfMember } from '../auth/credentials.service';
import { getMembersSortedByFirstName } from '../members/members.service';

export { changePassword } from '../auth/credentials.service';
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
}

// @FollowsBlueprint service-orchestration
export async function readSignedInMember(memberId: string): Promise<SignedInMember | null> {
  const [credential, members] = await Promise.all([
    readCredentialOfMember(memberId),
    getMembersSortedByFirstName(),
  ]);
  if (credential === null) return null;
  const member = members.find((candidate) => candidate.id === memberId);
  if (member === undefined) return null;
  return {
    memberId,
    firstName: member.firstName,
    color: member.color,
    username: credential.username,
  };
}
