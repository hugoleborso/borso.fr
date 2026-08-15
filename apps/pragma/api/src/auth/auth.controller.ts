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

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { credentialsSchema } from './auth.schema';
import { attemptLogin, bootstrapAuth, rotatePassword } from './auth.service';
import { type BucketStore, createBucketStore } from './rate-limit.utils';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from './session-cookie.utils';
import { requireSharedPasswordSession } from './shared-password.middleware';

const MILLISECONDS_PER_SECOND = 1_000;
const SESSION_COOKIE_MAX_AGE_S = SESSION_TTL_MS / MILLISECONDS_PER_SECOND;

export interface BuildAuthRouterOptions {
  readonly bucketStore?: BucketStore;
  readonly clock?: () => Date;
}

/**
 * @Blueprint controller-split-routers
 * @BlueprintName Controller With Split Routers
 * @BlueprintUsage Use for a slice whose routes do not all share one gate, so an ungated route cannot be mounted by mistake.
 * @BlueprintDescription Returns three named routers rather than one: login and the bootstrap endpoint stay open, while rotate-password is built on a router that applies requireSharedPasswordSession to every route it carries. The rate-limit store and the clock arrive through the options argument, so a caller can drive the login window without a real clock.
 */
export function buildAuthRouter(options: BuildAuthRouterOptions = {}) {
  const bucketStore = options.bucketStore ?? createBucketStore();
  const clock = options.clock ?? (() => new Date());

  const publicRouter = new Hono().post(
    '/login',
    zValidator('json', credentialsSchema),
    async (context) => {
      const { password } = context.req.valid('json');
      const outcome = await attemptLogin({
        password,
        forwardedForHeader: context.req.header('x-forwarded-for'),
        bucketStore,
        now: clock(),
      });
      if (outcome.kind === 'rate-limited') return context.json({ error: 'rate-limited' }, 429);
      if (outcome.kind === 'not-bootstrapped') {
        return context.json({ error: 'auth-not-bootstrapped' }, 503);
      }
      if (outcome.kind === 'invalid-password') {
        return context.json({ error: 'invalid-password' }, 401);
      }
      setCookie(context, SESSION_COOKIE_NAME, outcome.cookieValue, {
        httpOnly: true,
        secure: process.env.STAGE !== 'dev',
        sameSite: 'Strict',
        maxAge: SESSION_COOKIE_MAX_AGE_S,
        path: '/',
      });
      return context.json({ expiresAt: outcome.expiresAt });
    },
  );

  const bootstrapRouter = new Hono().post(
    '/set-password',
    zValidator('json', credentialsSchema),
    async (context) => {
      const { password } = context.req.valid('json');
      const outcome = await bootstrapAuth(password, clock());
      if (outcome.kind === 'already-bootstrapped') {
        return context.json({ error: 'already-bootstrapped' }, 409);
      }
      return context.json({ ok: true });
    },
  );

  const rotateRouter = new Hono()
    .use('*', requireSharedPasswordSession)
    .post('/rotate-password', zValidator('json', credentialsSchema), async (context) => {
      const { password } = context.req.valid('json');
      const outcome = await rotatePassword(password, clock());
      if (outcome.kind === 'not-bootstrapped') {
        return context.json({ error: 'auth-not-bootstrapped' }, 503);
      }
      return context.json({ ok: true });
    });

  return { publicRouter, bootstrapRouter, rotateRouter };
}
