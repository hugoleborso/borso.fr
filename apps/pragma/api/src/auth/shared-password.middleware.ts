/**
 * Hono middleware verifying the signed session cookie for every
 * authenticated route. Backed by the singleton `app_config` row's
 * `hmac_key`. See `docs/adr/0004-pragma-shared-password-auth.md`.
 *
 * Failure modes:
 *  - no cookie / malformed / bad signature / expired -> 401
 *  - app_config row missing -> 503 (server is not bootstrapped yet)
 */

import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { getDatabase } from '../database/client';
import { loadAppConfig } from './auth.repository';
import { SESSION_COOKIE_NAME, verifyCookie } from './session-cookie.utils';

export const requireSharedPasswordSession: MiddlewareHandler = async (context, next) => {
  const config = await loadAppConfig(getDatabase());
  if (config === null) {
    return context.json({ error: 'auth-not-bootstrapped' }, 503);
  }
  const cookie = getCookie(context, SESSION_COOKIE_NAME);
  if (cookie === undefined) {
    return context.json({ error: 'session-required' }, 401);
  }
  const result = verifyCookie(cookie, config.hmacKey, Date.now());
  if (!result.ok) {
    return context.json({ error: 'session-invalid', reason: result.reason }, 401);
  }
  await next();
  return;
};
