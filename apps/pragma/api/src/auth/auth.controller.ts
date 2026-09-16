import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { credentialsSchema } from './auth.schema';
import { bootstrapAuth, rotatePassword } from './auth.service';
import {
  attemptMemberLogin,
  enrolMember,
  type IssuedSession,
  readEnrolmentWindow,
} from './credentials.service';
import { enrolSchema, memberLoginSchema, passkeyAuthenticationSchema } from './credentials.schema';
import { requireMemberSession } from './member-session.middleware';
import { finishPasskeyAuthentication, startPasskeyAuthentication } from './passkey.service';
import { type BucketStore, createBucketStore } from './rate-limit.utils';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from './session-cookie.utils';

const MILLISECONDS_PER_SECOND = 1_000;
const SESSION_COOKIE_MAX_AGE_S = SESSION_TTL_MS / MILLISECONDS_PER_SECOND;

export interface BuildAuthRouterOptions {
  readonly bucketStore?: BucketStore;
  readonly clock?: () => Date;
}

function writeSessionCookie(context: Parameters<typeof setCookie>[0], session: IssuedSession) {
  setCookie(context, SESSION_COOKIE_NAME, session.cookieValue, {
    httpOnly: true,
    secure: process.env.STAGE !== 'dev',
    sameSite: 'Strict',
    maxAge: SESSION_COOKIE_MAX_AGE_S,
    path: '/',
  });
}

/**
 * @Blueprint controller-split-routers
 * @BlueprintName Controller With Split Routers
 * @BlueprintUsage Use for a slice whose routes do not all share one gate, so an ungated route cannot be mounted by mistake.
 * @BlueprintDescription Returns three named routers rather than one: login, enrolment and the passkey challenge stay open, the bootstrap endpoint stays open because nothing exists yet to gate on, and rotate-password is built on a router that applies requireMemberSession to every route it carries. The rate-limit store and the clock arrive through the options argument, so a caller can drive the login window without a real clock.
 */
export function buildAuthRouter(options: BuildAuthRouterOptions = {}) {
  const bucketStore = options.bucketStore ?? createBucketStore();
  const clock = options.clock ?? (() => new Date());

  const publicRouter = new Hono()
    .post('/login', zValidator('json', memberLoginSchema), async (context) => {
      const { username, password } = context.req.valid('json');
      const outcome = await attemptMemberLogin({
        username,
        password,
        forwardedForHeader: context.req.header('x-forwarded-for'),
        bucketStore,
        now: clock(),
      });
      if (outcome.kind === 'rate-limited') return context.json({ error: 'rate-limited' }, 429);
      if (outcome.kind === 'not-bootstrapped') {
        return context.json({ error: 'auth-not-bootstrapped' }, 503);
      }
      if (outcome.kind === 'invalid-credentials') {
        return context.json({ error: 'invalid-credentials' }, 401);
      }
      writeSessionCookie(context, outcome.session);
      return context.json({ expiresAt: outcome.session.expiresAt, memberId: outcome.memberId });
    })
    .get('/enrolment', async (context) => {
      const window = await readEnrolmentWindow();
      if (window.kind === 'closed') return context.json({ error: 'enrolment-closed' }, 409);
      return context.json({ offers: window.offers });
    })
    .post('/enrol', zValidator('json', enrolSchema), async (context) => {
      const body = context.req.valid('json');
      const outcome = await enrolMember({ ...body, now: clock() });
      if (outcome.kind === 'not-bootstrapped') {
        return context.json({ error: 'auth-not-bootstrapped' }, 503);
      }
      if (outcome.kind === 'enrolment-closed') {
        return context.json({ error: 'enrolment-closed' }, 409);
      }
      if (outcome.kind === 'already-enrolled') {
        return context.json({ error: 'already-enrolled' }, 409);
      }
      if (outcome.kind === 'username-taken') {
        return context.json({ error: 'username-taken' }, 409);
      }
      if (outcome.kind === 'unknown-member') {
        return context.json({ error: 'unknown-member' }, 404);
      }
      if (outcome.kind === 'invalid-shared-password') {
        return context.json({ error: 'invalid-shared-password' }, 401);
      }
      writeSessionCookie(context, outcome.session);
      return context.json({ expiresAt: outcome.session.expiresAt });
    })
    .post('/passkey/authentication/options', async (context) => {
      const started = await startPasskeyAuthentication(clock());
      if (started === null) return context.json({ error: 'passkey-unavailable' }, 503);
      return context.json(started.options);
    })
    .post(
      '/passkey/authentication/verify',
      zValidator('json', passkeyAuthenticationSchema),
      async (context) => {
        const { response } = context.req.valid('json');
        const outcome = await finishPasskeyAuthentication({ response, now: clock() });
        if (outcome.kind === 'verification-failed') {
          return context.json({ error: 'passkey-verification-failed' }, 401);
        }
        writeSessionCookie(context, outcome.session);
        return context.json({ expiresAt: outcome.session.expiresAt, memberId: outcome.memberId });
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
    .use('*', requireMemberSession)
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
