import { normalizeJoinCode } from '@api/games/join-code.utils';
import { JOIN_CODE_LENGTH } from '@api/games/games.schema';

export const INVITATION_PARAMETER = 'partie';

const TRAILING_SLASH = /\/$/u;

/**
 * @Blueprint core-address-a-guest-can-open-cold
 * @BlueprintName Core Address A Guest Can Open Cold
 * @BlueprintUsage Use for any address handed to someone who does not have the application open yet.
 * @BlueprintDescription Puts the identifier in the query of the root address rather than in a path segment, because a path segment only resolves once the distribution has been told to rewrite unknown paths to `index.html`, and a guest opening a link is by definition the one visitor who cannot have the router loaded already. The root path is served on every deployment there has ever been, so the link cannot outrun its infrastructure; once the page is up the router moves to the real address itself, which keeps the browser history and every in-application link on the readable form. Reading the code back is deliberately generous about case and spacing for the same reason `normalizeJoinCode` is — the value may have crossed a chat application that title-cased it.
 */
export function buildInvitationUrl(origin: string, joinCode: string): string {
  return `${origin.replace(TRAILING_SLASH, '')}/?${INVITATION_PARAMETER}=${joinCode}`;
}

export function readInvitedCode(rawParameter: string | null): string | null {
  if (rawParameter === null) return null;
  const code = normalizeJoinCode(rawParameter);
  return code.length === JOIN_CODE_LENGTH ? code : null;
}
