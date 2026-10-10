import { type Context, Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import {
  passkeyIdValidator,
  registrationOptionsValidator,
  webauthnResponseValidator,
} from './auth.schema';
import {
  endSession,
  finishAuthentication,
  finishRegistration,
  type IssuedSession,
  isSecureCookieStage,
  listRegisteredPasskeys,
  readClientAddress,
  readSessionStatus,
  readStage,
  removePasskey,
  SESSION_COOKIE_NAME,
  SESSION_LIFETIME_MS,
  startAuthentication,
  startRegistration,
} from './auth.service';
import { requireSession } from './session.middleware';

const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_LIFETIME_MS / 1000;

export interface BuildAuthRouterOptions {
  readonly clock?: () => Date;
}

function writeSessionCookie(context: Context, session: IssuedSession): void {
  setCookie(context, SESSION_COOKIE_NAME, session.cookieValue, {
    httpOnly: true,
    secure: isSecureCookieStage(readStage()),
    sameSite: 'Strict',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });
}

// @FollowsBlueprint controller-split-routers
export function buildAuthRouter(options: BuildAuthRouterOptions = {}) {
  const clock = options.clock ?? (() => new Date());

  const sessionRouter = new Hono().get('/', async (context) =>
    context.json(await readSessionStatus(getCookie(context, SESSION_COOKIE_NAME), clock())),
  );

  const ceremonyRouter = new Hono()
    .post('/registration/options', registrationOptionsValidator, async (context) =>
      context.json(
        await startRegistration({
          code: context.req.valid('json').code,
          cookie: getCookie(context, SESSION_COOKIE_NAME),
          clientAddress: readClientAddress(context),
          now: clock(),
        }),
      ),
    )
    .post('/registration/verification', webauthnResponseValidator, async (context) => {
      const session = await finishRegistration({
        response: context.req.valid('json').response,
        cookie: getCookie(context, SESSION_COOKIE_NAME),
        now: clock(),
      });
      writeSessionCookie(context, session);
      return context.json({ ok: true });
    })
    .post('/login/options', async (context) => context.json(await startAuthentication(clock())))
    .post('/login/verification', webauthnResponseValidator, async (context) => {
      const session = await finishAuthentication({
        response: context.req.valid('json').response,
        clientAddress: readClientAddress(context),
        now: clock(),
      });
      writeSessionCookie(context, session);
      return context.json({ ok: true });
    })
    .post('/logout', async (context) => {
      await endSession(getCookie(context, SESSION_COOKIE_NAME), clock());
      deleteCookie(context, SESSION_COOKIE_NAME, { path: '/' });
      return context.json({ ok: true });
    });

  const passkeysRouter = new Hono()
    .use('*', requireSession)
    .get('/', async (context) => context.json({ items: await listRegisteredPasskeys() }))
    .delete('/:id', passkeyIdValidator, async (context) => {
      await removePasskey(context.req.valid('param').id);
      return context.json({ ok: true });
    });

  return { sessionRouter, ceremonyRouter, passkeysRouter };
}
