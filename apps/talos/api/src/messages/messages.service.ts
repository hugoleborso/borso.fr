import { editContentFile } from '../content/content.service';
import { formatParisFileStamp } from '../helpers/calendar/paris-clock.utils';
import { fireRoutine } from '../helpers/routine/routine-fire.adapter';
import { buildMessageFileEdit, buildMessagePath } from './messages.core';

// @FollowsBlueprint service-orchestration
export async function sendMessageToTalos(text: string, now: Date): Promise<{ ok: true }> {
  const path = buildMessagePath(formatParisFileStamp(now));
  const outcome = await editContentFile(path, (current) =>
    buildMessageFileEdit(current, text, now.toISOString()),
  );
  await fireRoutine('message', path);
  return outcome;
}
