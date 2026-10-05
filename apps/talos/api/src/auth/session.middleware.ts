import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { TalosError } from '../helpers/errors/talos-error.types';
import { resolveSessionId, SESSION_COOKIE_NAME } from './auth.service';

// @FollowsBlueprint middleware-session-gate
export const requireSession: MiddlewareHandler = async (context, next) => {
  const sessionId = await resolveSessionId(getCookie(context, SESSION_COOKIE_NAME), new Date());
  if (sessionId === null) throw new TalosError('session-required');
  await next();
};
