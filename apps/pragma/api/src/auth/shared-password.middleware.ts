import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { getAppConfig } from './auth.service';
import { SESSION_COOKIE_NAME, verifyCookie } from './session-cookie.utils';

/**
 * @Blueprint middleware-session-gate
 * @BlueprintName Middleware Session Gate
 * @BlueprintUsage Use for the gate a router applies to every route it carries.
 * @BlueprintDescription Typed as `MiddlewareHandler`, and every failure answers with a response instead of calling `next`: a server that was never bootstrapped returns 503, and a missing, malformed, wrongly signed or expired cookie returns 401 carrying the reason the verifier gave. `next` is awaited on the success path only.
 */
export const requireSharedPasswordSession: MiddlewareHandler = async (context, next) => {
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
  await next();
  return;
};
