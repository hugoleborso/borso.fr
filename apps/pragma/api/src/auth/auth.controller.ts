/**
 * Authentication controller. Hono routing + Zod parsing; orchestration
 * lives in `auth.service.ts`, DB access in `auth.repository.ts`.
 *
 *  - POST /api/auth/login           — verify password, set session cookie.
 *  - POST /api/admin/set-password    — bootstrap; rejected if a row already exists.
 *  - POST /api/admin/rotate-password — rotate password + HMAC key
 *                                       (invalidates every existing cookie).
 *
 * The bootstrap endpoint is intentionally NOT gated by the session
 * middleware — it can only succeed exactly once, when the singleton row
 * does not yet exist. The rotate endpoint IS gated by the session
 * middleware: it is mounted on a dedicated router that applies
 * `requireSharedPasswordSession` to every route. Returning two distinct
 * admin routers (bootstrap vs. rotate) prevents the wiring mistake of
 * accidentally putting the rotate handler on an ungated router.
 */

import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getDatabase } from '../database/client';
import { bootstrapAuth, getAppConfig, rotatePassword, verifyPassword } from './auth.service';
import { hashIp, readClientIp } from './ip-hash.utils';
import {
  type BucketStore,
  createBucketStore,
  isRateLimited,
  recordAttempt,
} from './rate-limit.utils';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS, buildCookie } from './session-cookie.utils';
import { requireSharedPasswordSession } from './shared-password.middleware';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 256;
const SESSION_COOKIE_MAX_AGE_S = SESSION_TTL_MS / 1000;

const credentialsSchema = z.object({
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

export interface BuildAuthRouterOptions {
  readonly bucketStore?: BucketStore;
  readonly clock?: () => Date;
}

export function buildAuthRouter(options: BuildAuthRouterOptions = {}): {
  publicRouter: Hono;
  bootstrapRouter: Hono;
  rotateRouter: Hono;
} {
  const bucketStore = options.bucketStore ?? createBucketStore();
  const clock = options.clock ?? (() => new Date());

  const publicRouter = new Hono();
  publicRouter.post('/login', zValidator('json', credentialsSchema), async (context) => {
    const ipHash = hashIp(readClientIp(context.req.header('x-forwarded-for')));
    const now = clock();
    const updatedBucket = recordAttempt(bucketStore.read(ipHash), now.getTime());
    bucketStore.write(ipHash, updatedBucket);
    if (isRateLimited(updatedBucket)) {
      return context.json({ error: 'rate-limited' }, 429);
    }
    const config = await getAppConfig(getDatabase());
    if (config === null) {
      return context.json({ error: 'auth-not-bootstrapped' }, 503);
    }
    const { password } = context.req.valid('json');
    const passwordOk = await verifyPassword(config, password);
    if (!passwordOk) {
      return context.json({ error: 'invalid-password' }, 401);
    }
    bucketStore.clear(ipHash);
    const cookie = buildCookie(config.hmacKey, now.getTime());
    setCookie(context, SESSION_COOKIE_NAME, cookie, {
      httpOnly: true,
      secure: process.env.STAGE !== 'dev',
      sameSite: 'Strict',
      maxAge: SESSION_COOKIE_MAX_AGE_S,
      path: '/',
    });
    return context.json({ expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString() });
  });

  const bootstrapRouter = new Hono();
  bootstrapRouter.post(
    '/set-password',
    zValidator('json', credentialsSchema),
    async (context) => {
      const { password } = context.req.valid('json');
      const result = await bootstrapAuth(getDatabase(), password, clock());
      if (result.kind === 'already-bootstrapped') {
        return context.json({ error: 'already-bootstrapped' }, 409);
      }
      return context.json({ ok: true });
    },
  );

  const rotateRouter = new Hono();
  // The session middleware is applied here, on the rotate-only router,
  // so the bootstrap route can stay ungated while every rotate call is
  // forced through cookie verification.
  rotateRouter.use('*', requireSharedPasswordSession);
  rotateRouter.post(
    '/rotate-password',
    zValidator('json', credentialsSchema),
    async (context) => {
      const { password } = context.req.valid('json');
      const result = await rotatePassword(getDatabase(), password, clock());
      if (result.kind === 'not-bootstrapped') {
        return context.json({ error: 'auth-not-bootstrapped' }, 503);
      }
      return context.json({ ok: true });
    },
  );

  return { publicRouter, bootstrapRouter, rotateRouter };
}
