import type { MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie } from 'hono/cookie';
import { isRequestOriginRejected } from './auth.core';
import { getDatabase, verifySession } from './auth.service';

const ADMIN_COOKIE_NAME = 'lastloop_admin';

export const requireAdminSession: MiddlewareHandler = async (context, next) => {
  const isOriginRejected = isRequestOriginRejected(
    context.req.method,
    context.req.header('origin'),
    process.env.ALLOWED_ORIGIN,
  );
  if (isOriginRejected) {
    return context.json({ error: 'admin origin rejected' }, 403);
  }
  const sessionId = getCookie(context, ADMIN_COOKIE_NAME);
  if (sessionId === undefined) {
    return context.json({ error: 'admin session required' }, 401);
  }
  const session = await verifySession(getDatabase(), sessionId, new Date());
  if (session === null) {
    deleteCookie(context, ADMIN_COOKIE_NAME, { path: '/' });
    return context.json({ error: 'invalid session' }, 401);
  }
  await next();
};

export const AUTH_COOKIE_NAME = ADMIN_COOKIE_NAME;
