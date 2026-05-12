import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { getDatabase } from '../database/client';
import { AUTH_COOKIE_NAME } from './auth.middleware';
import { loginInputSchema } from './auth.schema';
import { AuthDeniedError, login } from './auth.service';

const authRouter = new Hono();

const ADMIN_COOKIE_TTL_SECONDS = 12 * 60 * 60;

function readClientIp(headerValue: string | undefined): string {
  if (headerValue === undefined) return 'unknown';
  const first = headerValue.split(',')[0];
  return first === undefined ? 'unknown' : first.trim();
}

authRouter.post('/login', zValidator('json', loginInputSchema), async (context) => {
  const ip = readClientIp(context.req.header('x-forwarded-for'));
  try {
    const result = await login(getDatabase(), { pin: context.req.valid('json').pin, ipAddress: ip }, new Date());
    setCookie(context, AUTH_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.STAGE !== 'dev',
      sameSite: 'Strict',
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

export { authRouter };
