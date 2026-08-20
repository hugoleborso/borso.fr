/** @Feature songs */

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
