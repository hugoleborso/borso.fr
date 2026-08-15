/**
 * Why a route has no record to draw. A detail route that reads one record by
 * id has two ways to end up with nothing: the record is gone, or the read
 * itself failed. They read the same to the code above — `data` is undefined
 * either way — and they need opposite sentences on screen, so the reason is
 * derived here and the route maps it to its own wording.
 */

import { ApiError } from './api';

export type MissingRecordReason = 'not-found' | 'load-failed';

const NOT_FOUND_STATUS = 404;

export function selectMissingRecordReason(error: unknown): MissingRecordReason {
  if (error instanceof ApiError && error.status === NOT_FOUND_STATUS) return 'not-found';
  return 'load-failed';
}
