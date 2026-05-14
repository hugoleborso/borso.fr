import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { JwtVerificationError, verifyAdminSession } from './auth.jwt';

const ADMIN_COOKIE_NAME = 'lastloop_admin';

export const requireAdminSession: MiddlewareHandler = async (context, next) => {
  const secret = process.env.JWT_SECRET;
  if (secret === undefined || secret.length === 0) {
    return context.json({ error: 'admin auth misconfigured' }, 500);
  }
  const token = getCookie(context, ADMIN_COOKIE_NAME);
  if (token === undefined) {
    return context.json({ error: 'admin session required' }, 401);
  }
  try {
    await verifyAdminSession(secret, token);
  } catch (error) {
    if (error instanceof JwtVerificationError) {
      return context.json({ error: 'invalid session' }, 401);
    }
    throw error;
  }
  await next();
};

export const AUTH_COOKIE_NAME = ADMIN_COOKIE_NAME;
