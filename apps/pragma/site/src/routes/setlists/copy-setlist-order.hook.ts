/** @Feature setlists */

import { useState } from 'react';
import {
  type ClipboardSetlistEntry,
  formatSetlistOrder,
  type SetlistEditorSong,
} from '../../components/organisms/setlist-editor.utils';
import { didCopyTextToClipboard } from '../../lib/clipboard.adapter';

const COPY_FEEDBACK_MS = 2000;

export type CopyFeedback = 'copied' | 'failed' | null;

export interface CopySetlistOrder {
  readonly feedback: CopyFeedback;
  readonly copy: () => void;
}

// @FollowsBlueprint hook-timer-owned-by-handlers
export function useCopySetlistOrder(
  entries: readonly ClipboardSetlistEntry[],
  songsById: Readonly<Record<string, SetlistEditorSong>>,
): CopySetlistOrder {
  const [feedback, setFeedback] = useState<CopyFeedback>(null);
  const copyAndTell = async (): Promise<void> => {
    const isCopied = await didCopyTextToClipboard(formatSetlistOrder(entries, songsById));
    setFeedback(isCopied ? 'copied' : 'failed');
    window.setTimeout(() => setFeedback(null), COPY_FEEDBACK_MS);
  };
  return { feedback, copy: () => void copyAndTell() };
}
