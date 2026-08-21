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

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const ADMIN_COOKIE_TTL_HOURS = 12;
const ADMIN_COOKIE_TTL_SECONDS = ADMIN_COOKIE_TTL_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

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
