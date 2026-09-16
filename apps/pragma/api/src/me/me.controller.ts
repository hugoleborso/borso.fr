import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import {
  passkeyIdParamSchema,
  passkeyRegistrationSchema,
  passwordChangeSchema,
} from '../auth/credentials.schema';
import { readMemberId, requireMemberSession } from '../auth/member-session.middleware';
import { memberContactSchema } from '../members/members.schema';
import {
  changePassword,
  finishPasskeyRegistration,
  listPasskeys,
  readSignedInMember,
  removePasskey,
  saveOwnContactDetails,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  startPasskeyRegistration,
} from './me.service';

const MILLISECONDS_PER_SECOND = 1_000;
const SESSION_COOKIE_MAX_AGE_S = SESSION_TTL_MS / MILLISECONDS_PER_SECOND;

function readNow(): Date {
  return new Date();
}

// @FollowsBlueprint controller-guarded-router
export function buildMeRouter() {
  return new Hono()
    .use('*', requireMemberSession)
    .get('/', async (context) => {
      const member = await readSignedInMember(readMemberId(context));
      if (member === null) return context.json({ error: 'unknown-member' }, 404);
      return context.json(member);
    })
    .put('/contact', zValidator('json', memberContactSchema), async (context) => {
      const memberId = readMemberId(context);
      const outcome = await saveOwnContactDetails(memberId, context.req.valid('json'));
      if (outcome.kind === 'empty') return context.json({ error: 'empty-update' }, 400);
      if (outcome.kind === 'not-found') return context.json({ error: 'unknown-member' }, 404);
      const member = await readSignedInMember(memberId);
      if (member === null) return context.json({ error: 'unknown-member' }, 404);
      return context.json(member);
    })
    .put('/password', zValidator('json', passwordChangeSchema), async (context) => {
      const { currentPassword, newPassword } = context.req.valid('json');
      const outcome = await changePassword({
        memberId: readMemberId(context),
        currentPassword,
        newPassword,
        now: readNow(),
      });
      if (outcome.kind === 'unknown-member') return context.json({ error: 'unknown-member' }, 404);
      if (outcome.kind === 'not-bootstrapped') {
        return context.json({ error: 'auth-not-bootstrapped' }, 503);
      }
      if (outcome.kind === 'invalid-password') {
        return context.json({ error: 'invalid-password' }, 401);
      }
      setCookie(context, SESSION_COOKIE_NAME, outcome.session.cookieValue, {
        httpOnly: true,
        secure: process.env.STAGE !== 'dev',
        sameSite: 'Strict',
        maxAge: SESSION_COOKIE_MAX_AGE_S,
        path: '/',
      });
      return context.json({ expiresAt: outcome.session.expiresAt });
    })
    .get('/passkeys', async (context) => {
      return context.json({ passkeys: await listPasskeys(readMemberId(context)) });
    })
    .post('/passkeys/options', async (context) => {
      const outcome = await startPasskeyRegistration(readMemberId(context), readNow());
      if (outcome.kind === 'unknown-member') return context.json({ error: 'unknown-member' }, 404);
      return context.json(outcome.options);
    })
    .post('/passkeys', zValidator('json', passkeyRegistrationSchema), async (context) => {
      const { label, response } = context.req.valid('json');
      const outcome = await finishPasskeyRegistration({
        memberId: readMemberId(context),
        label,
        response,
        now: readNow(),
      });
      if (outcome.kind === 'verification-failed') {
        return context.json({ error: 'passkey-verification-failed' }, 401);
      }
      return context.json({ ok: true }, 201);
    })
    .delete('/passkeys/:passkeyId', zValidator('param', passkeyIdParamSchema), async (context) => {
      const { passkeyId } = context.req.valid('param');
      const outcome = await removePasskey(readMemberId(context), passkeyId);
      if (outcome === 'not-found') return context.json({ error: 'not-found' }, 404);
      return context.body(null, 204);
    });
}
