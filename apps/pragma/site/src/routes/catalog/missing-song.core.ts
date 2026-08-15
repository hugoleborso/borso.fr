/**
 * The sentence a song route shows in place of the song, chosen from why the
 * read came back empty. A deleted song and an unreachable API both leave the
 * route with nothing to draw, and telling the reader the song is gone when the
 * network is what failed sends them looking for a song that is still there.
 * @Feature songs
 */

import type { ParseKeys } from 'i18next';
import {
  type MissingRecordReason,
  selectMissingRecordReason,
} from '../../lib/missing-record.utils';

const MESSAGE_KEY_BY_REASON = {
  'not-found': 'catalog.songNotFound',
  'load-failed': 'common.loadFailed',
} as const satisfies Record<MissingRecordReason, ParseKeys>;

export function selectMissingSongMessageKey(error: unknown): ParseKeys {
  return MESSAGE_KEY_BY_REASON[selectMissingRecordReason(error)];
}
