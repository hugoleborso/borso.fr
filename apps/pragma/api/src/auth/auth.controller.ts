/**
 * Authentication controller.
 *
 *  - POST /api/auth/login           — verify password, set session cookie.
 *  - POST /api/admin/set-password    — bootstrap; rejected if a row already exists.
 *  - POST /api/admin/rotate-password — rotate password + HMAC key
 *                                       (invalidates every existing cookie).
 *
 * The bootstrap endpoint is intentionally NOT gated by the session
 * middleware — it can only succeed exactly once, when the singleton row
 * does not yet exist. The rotate endpoint IS gated by the session
 * middleware (mounted upstream by the route registrar).
 */

import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getDatabase } from '../database/client';
import { insertInitialAppConfig, loadAppConfig, updateAppConfig } from './app-config.repository';
import { hashIp, readClientIp } from './ip-hash.utils';
import {
  type BucketStore,
  createBucketStore,
  isRateLimited,
  recordAttempt,
} from './rate-limit.utils';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS, buildCookie } from './session-cookie.utils';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 256;
const HMAC_KEY_BYTES = 32;
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
  adminRouter: Hono;
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
    const config = await loadAppConfig(getDatabase());
    if (config === null) {
      return context.json({ error: 'auth-not-bootstrapped' }, 503);
    }
    const { password } = context.req.valid('json');
    const passwordOk = await argon2.verify(config.passwordHash, password);
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

  const adminRouter = new Hono();

  adminRouter.post('/set-password', zValidator('json', credentialsSchema), async (context) => {
    const database = getDatabase();
    const existing = await loadAppConfig(database);
    if (existing !== null) {
      return context.json({ error: 'already-bootstrapped' }, 409);
    }
    const { password } = context.req.valid('json');
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    const hmacKey = randomBytes(HMAC_KEY_BYTES);
    await insertInitialAppConfig(database, hash, hmacKey, clock());
    return context.json({ ok: true });
  });

  adminRouter.post('/rotate-password', zValidator('json', credentialsSchema), async (context) => {
    const database = getDatabase();
    const existing = await loadAppConfig(database);
    if (existing === null) {
      return context.json({ error: 'auth-not-bootstrapped' }, 503);
    }
    const { password } = context.req.valid('json');
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    const hmacKey = randomBytes(HMAC_KEY_BYTES);
    await updateAppConfig(database, hash, hmacKey, clock());
    return context.json({ ok: true });
  });

  return { publicRouter, adminRouter };
}
