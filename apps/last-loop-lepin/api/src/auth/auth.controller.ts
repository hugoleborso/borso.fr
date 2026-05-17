import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { getDatabase } from '../database/client';
import { AUTH_COOKIE_NAME } from './auth.middleware';
import { loginInputSchema } from './auth.schema';
import { AuthDeniedError, login, logout } from './auth.service';

const authRouter = new Hono();

const ADMIN_COOKIE_TTL_SECONDS = 12 * 60 * 60;

function readClientIp(headerValue: string | undefined): string {
  if (headerValue === undefined) return 'unknown';
  const first = headerValue.split(',')[0];
  return first === undefined ? 'unknown' : first.trim();
}

/**
 * `sameSite: 'Lax'` is the deliberate default — `Strict` blocked the
 * cookie on every top-level navigation from outside the app (links in
 * mail, bookmarks opened from elsewhere, OAuth-style redirects),
 * forcing the operator to log in again on each visit. Lax sends the
 * cookie on GET top-level navigations but withholds it on cross-site
 * POST/PUT/PATCH/DELETE — the state-changing CSRF surface stays
 * covered. `requireAdminSession` adds an explicit Origin-header check
 * as belt-and-braces for scripted cross-origin requests.
 */
authRouter.post('/login', zValidator('json', loginInputSchema), async (context) => {
  const ip = readClientIp(context.req.header('x-forwarded-for'));
  try {
    const result = await login(getDatabase(), { pin: context.req.valid('json').pin, ipAddress: ip }, new Date());
    setCookie(context, AUTH_COOKIE_NAME, result.sessionId, {
      httpOnly: true,
      secure: process.env.STAGE !== 'dev',
      sameSite: 'Lax',
      maxAge: ADMIN_COOKIE_TTL_SECONDS,
      path: '/',
    });
    return context.json({ expiresAt: result.expiresAt.toISOString() });
  } catch (error) {
    if (error instanceof AuthDeniedError) {
      const status = error.reason === 'rate-limited' ? 429 : error.reason === 'misconfigured' ? 500 : 401;
      return context.json({ error: 'auth denied', reason: error.reason }, status);
    }
    throw error;
  }
});

authRouter.post('/logout', async (context) => {
  const sessionId = getCookie(context, AUTH_COOKIE_NAME);
  if (sessionId !== undefined) {
    await logout(getDatabase(), sessionId);
  }
  deleteCookie(context, AUTH_COOKIE_NAME, { path: '/' });
  return context.json({ ok: true });
});

export { authRouter };
