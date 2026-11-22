import type { Context, MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { addWideEventFields } from '../helpers/observability/wide-event.adapter';
import { readSessionAccount } from './accounts.service';
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from './session-cookie.utils';

const ACCOUNT_ID_KEY = 'accountId';

const COOKIE_ATTRIBUTES = {
  httpOnly: true,
  secure: true,
  sameSite: 'None',
  path: '/',
} as const;

// @FollowsBlueprint middleware-session-gate
export const readOptionalSession: MiddlewareHandler = async (context, next) => {
  const accountId = await readSessionAccount(getCookie(context, SESSION_COOKIE_NAME), new Date());
  context.set(ACCOUNT_ID_KEY, accountId);
  if (accountId !== null) addWideEventFields({ 'account.id': accountId });
  await next();
};

export function readAccountId(context: Context): string | null {
  const accountId: unknown = context.get(ACCOUNT_ID_KEY);
  return typeof accountId === 'string' ? accountId : null;
}

export function readVisit(context: Context): {
  readonly accountId: string | null;
  readonly now: Date;
} {
  return { accountId: readAccountId(context), now: new Date() };
}

export function writeSessionCookie(context: Context, cookieValue: string): void {
  setCookie(context, SESSION_COOKIE_NAME, cookieValue, {
    ...COOKIE_ATTRIBUTES,
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(context: Context): void {
  deleteCookie(context, SESSION_COOKIE_NAME, COOKIE_ATTRIBUTES);
}
