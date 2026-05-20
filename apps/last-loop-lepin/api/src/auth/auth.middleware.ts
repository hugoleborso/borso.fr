import type { MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie } from 'hono/cookie';
import { getDatabase } from '../database/client';
import { verifySession } from './auth.service';

const ADMIN_COOKIE_NAME = 'lastloop_admin';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Returns the list of `Origin` header values the API will accept on
 * state-changing requests, computed from `ALLOWED_ORIGIN` (set by CDK
 * per stage). SameSite=Lax on the session cookie protects against most
 * CSRF via cross-site form submits, but it doesn't cover scripted
 * requests from a malicious origin if a user's session is live — the
 * Origin check closes that gap. Returns `null` (not `[]`) when no
 * allow-list is configured, so callers can distinguish "disabled" from
 * "configured but empty".
 */
function readAllowedOrigins(): readonly string[] | null {
  const raw = process.env.ALLOWED_ORIGIN;
  if (raw === undefined || raw.length === 0) return null;
  return raw.split(',').map((origin) => origin.trim()).filter((origin) => origin.length > 0);
}

export const requireAdminSession: MiddlewareHandler = async (context, next) => {
  if (STATE_CHANGING_METHODS.has(context.req.method)) {
    const allowed = readAllowedOrigins();
    if (allowed !== null) {
      const origin = context.req.header('origin');
      if (origin === undefined || !allowed.includes(origin)) {
        return context.json({ error: 'admin origin rejected' }, 403);
      }
    }
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
