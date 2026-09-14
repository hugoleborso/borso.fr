import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { getAppConfig } from './auth.service';
import { findCredentialByMemberId } from './credentials.repository';
import { judgeMemberSession } from './member-session.core';
import { SESSION_COOKIE_NAME, verifyCookie } from './session-cookie.utils';

const MEMBER_ID_KEY = 'memberId';

/**
 * @Blueprint middleware-session-gate
 * @BlueprintName Middleware Session Gate
 * @BlueprintUsage Use for the gate a router applies to every route it carries.
 * @BlueprintDescription Typed as `MiddlewareHandler`, and every failure answers with a response instead of calling `next`: a server that was never bootstrapped returns 503, and a missing, malformed, wrongly signed, expired or superseded cookie returns 401 carrying the reason. The verdict of the cookie and the verdict of the credential behind it are two separate reads, because only the second can see a password change. `next` is awaited on the success path only, after the resolved member is written to the context.
 */
export const requireMemberSession: MiddlewareHandler = async (context, next) => {
  const config = await getAppConfig();
  if (config === null) {
    return context.json({ error: 'auth-not-bootstrapped' }, 503);
  }
  const cookie = getCookie(context, SESSION_COOKIE_NAME);
  if (cookie === undefined) {
    return context.json({ error: 'session-required' }, 401);
  }
  const session = verifyCookie(cookie, config.hmacKey, Date.now());
  if (!session.ok) {
    return context.json({ error: 'session-invalid', reason: session.reason }, 401);
  }
  const credential = await findCredentialByMemberId(session.payload.memberId);
  const verdict = judgeMemberSession(session.payload, credential, Date.now());
  if (verdict.kind !== 'valid') {
    return context.json({ error: 'session-invalid', reason: verdict.kind }, 401);
  }
  context.set(MEMBER_ID_KEY, verdict.memberId);
  await next();
  return;
};

export function readMemberId(context: Context): string {
  const memberId: unknown = context.get(MEMBER_ID_KEY);
  if (typeof memberId !== 'string') throw new Error('member session was not resolved');
  return memberId;
}
