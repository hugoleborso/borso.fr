/** @Feature setlists */

import type { ParseKeys } from 'i18next';
import {
  type MissingRecordReason,
  selectMissingRecordReason,
} from '../../lib/missing-record.utils';

const MESSAGE_KEY_BY_REASON = {
  'not-found': 'setlist.notFound',
  'load-failed': 'common.loadFailed',
} as const satisfies Record<MissingRecordReason, ParseKeys>;

// @FollowsBlueprint core-error-to-key
export function selectMissingSetlistMessageKey(error: unknown): ParseKeys {
  return MESSAGE_KEY_BY_REASON[selectMissingRecordReason(error)];
}
