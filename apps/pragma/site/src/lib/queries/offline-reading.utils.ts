/** @Feature shell */

const PATH_SEPARATOR = '/';

export interface OfflineManifestUrls {
  readonly songDetailUrls: readonly string[];
  readonly nextSessionUrl: string | null;
}

export interface OfflineReadingTargets {
  readonly songIds: readonly string[];
  readonly sessionIds: readonly string[];
}

function selectLastPathSegment(url: string): string {
  return url.slice(url.lastIndexOf(PATH_SEPARATOR) + 1);
}

// @FollowsBlueprint utils-pure-module
export function selectOfflineReadingTargets(manifest: OfflineManifestUrls): OfflineReadingTargets {
  return {
    songIds: manifest.songDetailUrls.map(selectLastPathSegment),
    sessionIds:
      manifest.nextSessionUrl === null ? [] : [selectLastPathSegment(manifest.nextSessionUrl)],
  };
}

export interface QueryCacheUpdate {
  readonly eventType: string;
  readonly actionType: string | undefined;
  readonly queryHash: string;
  readonly data: unknown;
}

const UPDATED_EVENT = 'updated';
const SUCCESS_ACTION = 'success';

function isAuthenticatedProbe(data: unknown): boolean {
  if (typeof data !== 'object' || data === null || !('authenticated' in data)) return false;
  return data.authenticated === true;
}

// @FollowsBlueprint utils-pure-module
export function isSignInUpdate(update: QueryCacheUpdate, sessionQueryHash: string): boolean {
  if (update.eventType !== UPDATED_EVENT || update.actionType !== SUCCESS_ACTION) return false;
  if (update.queryHash !== sessionQueryHash) return false;
  return isAuthenticatedProbe(update.data);
}
