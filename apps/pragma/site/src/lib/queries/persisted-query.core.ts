import type { QueryKey } from '@tanstack/react-query';
import { concertRegistrationKeys } from './concert-registrations.queries';
import { songKeys } from './songs.queries';

const SONG_PREVIEW_ROOT = songKeys.preview('').slice(0, -1);
const REMEMBERED_REGISTRATION_ROOT = concertRegistrationKeys.remembered('').slice(0, -1);
const ROOTS_KEPT_IN_MEMORY: readonly QueryKey[] = [SONG_PREVIEW_ROOT, REMEMBERED_REGISTRATION_ROOT];

// @FollowsBlueprint core-decision
export function isQueryKeyPersisted(queryKey: QueryKey): boolean {
  return !ROOTS_KEPT_IN_MEMORY.some((root) =>
    root.every((part, index) => queryKey[index] === part),
  );
}

const SUCCESS_STATUS = 'success';

export interface PersistableQuery {
  readonly queryKey: QueryKey;
  readonly state: { readonly status: string };
}

export function isQueryPersisted(query: PersistableQuery): boolean {
  return query.state.status === SUCCESS_STATUS && isQueryKeyPersisted(query.queryKey);
}
