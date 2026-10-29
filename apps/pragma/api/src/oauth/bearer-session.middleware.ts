import type { MiddlewareHandler } from 'hono';
import { rememberMemberId } from '../auth/member-session.middleware';
import { authenticateAccessToken } from './oauth.service';

const AUTHORIZATION_HEADER = 'authorization';
const CHALLENGE_HEADER = 'WWW-Authenticate';
const INVALID_TOKEN_ERROR = 'invalid_token';

// @FollowsBlueprint middleware-session-gate
export function requireBearerSession(clock: () => Date): MiddlewareHandler {
  return async (context, next) => {
    const verdict = await authenticateAccessToken(
      context.req.header(AUTHORIZATION_HEADER),
      clock(),
    );
    if (verdict.kind === 'refused') {
      return context.json({ error: INVALID_TOKEN_ERROR }, 401, {
        [CHALLENGE_HEADER]: verdict.challenge,
      });
    }
    rememberMemberId(context, verdict.memberId);
    await next();
    return;
  };
}
