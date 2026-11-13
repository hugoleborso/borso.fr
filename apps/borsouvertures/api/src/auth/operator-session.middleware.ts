import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { readSessionVerdict } from './auth.service';
import { SESSION_COOKIE_NAME } from './session-cookie.utils';

// @FollowsBlueprint middleware-session-gate
export const requireOperatorSession: MiddlewareHandler = async (context, next) => {
  const verdict = await readSessionVerdict(getCookie(context, SESSION_COOKIE_NAME), new Date());
  if (verdict !== 'valid') {
    return context.json({ error: 'session-required', reason: verdict }, 401);
  }
  await next();
  return;
};
