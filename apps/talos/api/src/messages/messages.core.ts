import type { FileEdit } from '../content/content.service';

const MESSAGES_DIRECTORY = 'boite/messages';
const MESSAGE_COMMIT = 'pwa : message pour Talos';

export function buildMessagePath(fileStamp: string): string {
  return `${MESSAGES_DIRECTORY}/${fileStamp}.md`;
}

// @FollowsBlueprint core-serializer
export function buildMessageFileEdit(
  current: string | null,
  text: string,
  sentAt: string,
): FileEdit<{ readonly ok: true }> {
  const content =
    current === null
      ? `---\norigine: pwa\ndate: ${sentAt}\n---\n\n${text}\n`
      : `${current.trimEnd()}\n\n${text}\n`;
  return { content, commitMessage: MESSAGE_COMMIT, outcome: { ok: true } };
}
