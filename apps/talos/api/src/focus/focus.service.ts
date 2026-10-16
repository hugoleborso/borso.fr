import { type Focus, type FocusItem, parseFocus, serializeFocus } from '@domain/focus.core';
import { editContentFile, readContentFile } from '../content/content.service';
import { formatParisDate } from '../helpers/calendar/paris-clock.utils';
import { isMemoryInDatabase } from '../memory/memory-cutover.service';
import { readMemoryFocus, recordPwaChanges } from '../memory/memory-pwa.service';
import { projectStoredFocus } from './focus.core';

const FOCUS_PATH = 'focus.md';
const FOCUS_COMMIT_MESSAGE = 'pwa : focus mis à jour';

// @FollowsBlueprint service-orchestration
export async function readFocus(): Promise<Focus> {
  if (await isMemoryInDatabase()) return projectStoredFocus(await readMemoryFocus());
  return parseFocus((await readContentFile(FOCUS_PATH)) ?? '');
}

async function replaceStoredFocus(focusItems: readonly FocusItem[], now: Date): Promise<Focus> {
  await recordPwaChanges(
    FOCUS_COMMIT_MESSAGE,
    [{ op: 'focus.replace', items: [...focusItems], updatedOn: formatParisDate(now) }],
    now,
  );
  return projectStoredFocus(await readMemoryFocus());
}

export async function replaceFocus(focusItems: readonly FocusItem[], now: Date): Promise<Focus> {
  if (await isMemoryInDatabase()) return await replaceStoredFocus(focusItems, now);
  const content = serializeFocus(formatParisDate(now), focusItems);
  return await editContentFile(FOCUS_PATH, () => ({
    content,
    commitMessage: FOCUS_COMMIT_MESSAGE,
    outcome: parseFocus(content),
  }));
}
