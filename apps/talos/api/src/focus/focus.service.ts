import type { Focus, FocusItem } from '@domain/focus.core';
import { formatParisDate } from '../helpers/calendar/paris-clock.utils';
import { readMemoryFocus, recordPwaChanges } from '../memory/memory-pwa.service';
import { projectStoredFocus } from './focus.core';

const FOCUS_COMMIT_MESSAGE = 'pwa : focus mis à jour';

// @FollowsBlueprint service-orchestration
export async function readFocus(): Promise<Focus> {
  return projectStoredFocus(await readMemoryFocus());
}

export async function replaceFocus(focusItems: readonly FocusItem[], now: Date): Promise<Focus> {
  await recordPwaChanges(
    FOCUS_COMMIT_MESSAGE,
    [{ op: 'focus.replace', items: [...focusItems], updatedOn: formatParisDate(now) }],
    now,
  );
  return projectStoredFocus(await readMemoryFocus());
}
