import { ApiError } from './api.client';

export type MissingRecordReason = 'not-found' | 'load-failed';

const NOT_FOUND_STATUS = 404;

export function selectMissingRecordReason(error: unknown): MissingRecordReason {
  if (error instanceof ApiError && error.status === NOT_FOUND_STATUS) return 'not-found';
  return 'load-failed';
}
