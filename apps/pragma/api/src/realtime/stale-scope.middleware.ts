import { isStaleScope, REALTIME_CLIENT_HEADER, type StaleScope } from '@domain/stale-scope.core';
import type { Context, MiddlewareHandler } from 'hono';
import { announceStaleScope, type StaleBroadcastSettings } from './realtime.service';
import { selectAnnouncedStaleScope } from './stale-scope.core';

const STALE_SCOPE_KEY = 'staleScope';

export function rememberStaleScope(context: Context, scope: StaleScope | null): void {
  if (scope === null) return;
  context.set(STALE_SCOPE_KEY, scope);
}

function readRememberedStaleScope(context: Context): StaleScope | null {
  const remembered: unknown = context.get(STALE_SCOPE_KEY);
  return isStaleScope(remembered) ? remembered : null;
}

function readWriterClientId(context: Context): string | null {
  const clientId = context.req.header(REALTIME_CLIENT_HEADER);
  return clientId === undefined || clientId.length === 0 ? null : clientId;
}

// @FollowsBlueprint middleware-public-rate-limit
export function buildStaleScopeAnnouncer(settings: StaleBroadcastSettings): MiddlewareHandler {
  return async (context, next) => {
    await next();
    const scope = selectAnnouncedStaleScope({
      method: context.req.method,
      path: context.req.path,
      status: context.res.status,
      rememberedScope: readRememberedStaleScope(context),
    });
    if (scope === null) return;
    await announceStaleScope(scope, readWriterClientId(context), settings);
  };
}
