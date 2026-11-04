import { REALTIME_CLIENT_HEADER, type WrittenRoot } from '@domain/stale-scope.core';
import type { Context, MiddlewareHandler } from 'hono';
import { announceWrittenRoots, type StaleBroadcastSettings } from './realtime.service';
import {
  mergeWrittenRoots,
  readWrittenRoots,
  selectAnnouncedWrittenRoots,
} from './stale-scope.core';

const WRITTEN_ROOTS_KEY = 'writtenRoots';

function readRememberedWrittenRoots(context: Context): readonly WrittenRoot[] {
  const remembered: unknown = context.get(WRITTEN_ROOTS_KEY);
  return readWrittenRoots(remembered);
}

export function rememberWrittenRoots(context: Context, roots: readonly WrittenRoot[]): void {
  if (roots.length === 0) return;
  context.set(WRITTEN_ROOTS_KEY, mergeWrittenRoots(readRememberedWrittenRoots(context), roots));
}

function readWriterClientId(context: Context): string | null {
  const clientId = context.req.header(REALTIME_CLIENT_HEADER);
  return clientId === undefined || clientId.length === 0 ? null : clientId;
}

// @FollowsBlueprint middleware-public-rate-limit
export function buildWrittenRootsAnnouncer(settings: StaleBroadcastSettings): MiddlewareHandler {
  return async (context, next) => {
    await next();
    const written = selectAnnouncedWrittenRoots({
      method: context.req.method,
      path: context.req.path,
      status: context.res.status,
      rememberedRoots: readRememberedWrittenRoots(context),
    });
    if (written.length === 0) return;
    await announceWrittenRoots(written, readWriterClientId(context), settings);
  };
}
