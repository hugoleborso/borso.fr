import type { QueryKey } from '@tanstack/react-query';
import { songKeys } from './songs.queries';

const SONG_PREVIEW_ROOT = songKeys.preview('').slice(0, -1);

// @FollowsBlueprint core-decision
export function isQueryKeyPersisted(queryKey: QueryKey): boolean {
  return !SONG_PREVIEW_ROOT.every((part, index) => queryKey[index] === part);
}

const SUCCESS_STATUS = 'success';

export interface PersistableQuery {
  readonly queryKey: QueryKey;
  readonly state: { readonly status: string };
}

export function isQueryPersisted(query: PersistableQuery): boolean {
  return query.state.status === SUCCESS_STATUS && isQueryKeyPersisted(query.queryKey);
}
