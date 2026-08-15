/**
 * The sentence the session route shows in place of the session, chosen from
 * why the read came back empty. Counterpart of `missing-song.core.ts`; the
 * wording is the only thing that differs, and it belongs to this domain.
 */

import type { ParseKeys } from 'i18next';
import {
  type MissingRecordReason,
  selectMissingRecordReason,
} from '../../lib/missing-record.utils';

const MESSAGE_KEY_BY_REASON = {
  'not-found': 'sessions.sessionNotFound',
  'load-failed': 'common.loadFailed',
} as const satisfies Record<MissingRecordReason, ParseKeys>;

export function selectMissingSessionMessageKey(error: unknown): ParseKeys {
  return MESSAGE_KEY_BY_REASON[selectMissingRecordReason(error)];
}
