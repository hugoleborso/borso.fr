/** @Feature shell */

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
