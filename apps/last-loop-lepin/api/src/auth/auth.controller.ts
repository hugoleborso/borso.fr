import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { AUTH_COOKIE_NAME } from './auth.middleware';
import { loginInputSchema } from './auth.schema';
import {
  AuthDeniedError,
  httpStatusForAuthDenial,
  login,
  logout,
  readClientIp,
} from './auth.service';

const ADMIN_COOKIE_TTL_SECONDS = 12 * 60 * 60;

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
// @FollowsBlueprint controller-public-router
const authRouter = new Hono()
  .post('/login', zValidator('json', loginInputSchema), async (context) => {
    const ipAddress = readClientIp(context.req.header('x-forwarded-for'));
    try {
      const attempt = await login({ pin: context.req.valid('json').pin, ipAddress }, new Date());
      setCookie(context, AUTH_COOKIE_NAME, attempt.sessionId, {
        httpOnly: true,
        secure: process.env.STAGE !== 'dev',
        sameSite: 'Lax',
        maxAge: ADMIN_COOKIE_TTL_SECONDS,
        path: '/',
      });
      return context.json({ expiresAt: attempt.expiresAt.toISOString() });
    } catch (error) {
      if (error instanceof AuthDeniedError) {
        return context.json(
          { error: 'auth denied', reason: error.reason },
          httpStatusForAuthDenial(error.reason),
        );
      }
      throw error;
    }
  })
  .post('/logout', async (context) => {
    const sessionId = getCookie(context, AUTH_COOKIE_NAME);
    if (sessionId !== undefined) {
      await logout(sessionId);
    }
    deleteCookie(context, AUTH_COOKIE_NAME, { path: '/' });
    return context.json({ ok: true });
  });

export { authRouter };
