import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { signInSchema } from './auth.schema';
import {
  attemptSignIn,
  isCookieSecure,
  isOperatorSignedIn,
  readClientAddress,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
} from './auth.service';
import { requireOperatorSession } from './operator-session.middleware';

const SESSION_COOKIE_PATH = '/';

export interface BuildAuthRouterOptions {
  readonly clock?: () => Date;
}

// @FollowsBlueprint controller-split-routers
export function buildAuthRouter(options: BuildAuthRouterOptions = {}) {
  const clock = options.clock ?? (() => new Date());

  const publicRouter = new Hono()
    .post('/sign-in', zValidator('json', signInSchema), async (context) => {
      const { password } = context.req.valid('json');
      const outcome = await attemptSignIn({
        password,
        clientAddress: readClientAddress(context),
        now: clock(),
      });
      if (outcome.kind === 'refused') {
        return context.json({ error: outcome.refusal }, outcome.status);
      }
      setCookie(context, SESSION_COOKIE_NAME, outcome.cookieValue, {
        httpOnly: true,
        secure: isCookieSecure(),
        sameSite: 'Strict',
        maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
        path: SESSION_COOKIE_PATH,
      });
      return context.json({ signedIn: true });
    })
    .get('/session', async (context) => {
      const signedIn = await isOperatorSignedIn(getCookie(context, SESSION_COOKIE_NAME), clock());
      return context.json({ signedIn });
    });

  const sessionRouter = new Hono().post('/sign-out', requireOperatorSession, (context) => {
    deleteCookie(context, SESSION_COOKIE_NAME, { path: SESSION_COOKIE_PATH });
    return context.body(null, 204);
  });

  return { publicRouter, sessionRouter };
}
