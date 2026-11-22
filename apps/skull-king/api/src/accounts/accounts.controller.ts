import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  clearSessionCookie,
  readOptionalSession,
  readVisit,
  writeSessionCookie,
} from './account-session.middleware';
import { registrationOptionsSchema, registrationSchema, signInSchema } from './accounts.schema';
import {
  finishRegistration,
  finishSignIn,
  readMe,
  readMyGames,
  refuseInvalidInput,
  startRegistration,
  startSignIn,
} from './accounts.service';

const CREATED = 201;

// @FollowsBlueprint controller-dispatch
export function buildAccountsRouter() {
  return new Hono()
    .use('*', readOptionalSession)
    .post(
      '/registration/options',
      zValidator('json', registrationOptionsSchema, refuseInvalidInput),
      async (context) => {
        const options = await startRegistration(context.req.valid('json').name, new Date());
        return context.json({ options });
      },
    )
    .post(
      '/registration',
      zValidator('json', registrationSchema, refuseInvalidInput),
      async (context) => {
        const signedIn = await finishRegistration(context.req.valid('json'), new Date());
        writeSessionCookie(context, signedIn.cookieValue);
        return context.json({ account: signedIn.account }, CREATED);
      },
    )
    .post('/sign-in/options', async (context) => {
      const options = await startSignIn(new Date());
      return context.json({ options });
    })
    .post('/sign-in', zValidator('json', signInSchema, refuseInvalidInput), async (context) => {
      const signedIn = await finishSignIn(context.req.valid('json').response, new Date());
      writeSessionCookie(context, signedIn.cookieValue);
      return context.json({ account: signedIn.account });
    })
    .post('/sign-out', (context) => {
      clearSessionCookie(context);
      return context.json({ account: null });
    })
    .get('/me', async (context) => {
      const account = await readMe(readVisit(context).accountId);
      return context.json({ account });
    })
    .get('/me/games', async (context) => {
      const games = await readMyGames(readVisit(context));
      return context.json({ games });
    });
}
