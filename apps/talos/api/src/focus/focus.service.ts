import { type Focus, type FocusItem, parseFocus, serializeFocus } from '@domain/focus.core';
import { editContentFile, readContentFile } from '../content/content.service';
import { formatParisDate } from '../helpers/calendar/paris-clock.utils';

const FOCUS_PATH = 'focus.md';
const FOCUS_COMMIT_MESSAGE = 'pwa : focus mis à jour';

// @FollowsBlueprint service-passthrough
export async function readFocus(): Promise<Focus> {
  return parseFocus((await readContentFile(FOCUS_PATH)) ?? '');
}

export async function replaceFocus(focusItems: readonly FocusItem[], now: Date): Promise<Focus> {
  const content = serializeFocus(formatParisDate(now), focusItems);
  return await editContentFile(FOCUS_PATH, () => ({
    content,
    commitMessage: FOCUS_COMMIT_MESSAGE,
    outcome: parseFocus(content),
  }));
}
