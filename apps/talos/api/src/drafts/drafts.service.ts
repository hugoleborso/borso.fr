import type { DraftStatusChange } from '@domain/draft-status.core';
import { stripMarkdownExtension } from '@domain/markdown-page.core';
import {
  editContentFile,
  type FileEditor,
  listContentDirectory,
  readContentFiles,
} from '../content/content.service';
import { formatParisDate } from '../helpers/calendar/paris-clock.utils';
import { TalosError } from '../helpers/errors/talos-error.types';
import { isMemoryInDatabase } from '../memory/memory-cutover.service';
import { recordPwaChanges, renderMemoryDraft } from '../memory/memory-pwa.service';
import {
  buildDraftPath,
  changeDraftStatusFile,
  type Draft,
  type DraftStatusOutcome,
  isDraftFile,
  planStoredDraftStatus,
  selectDrafts,
} from './drafts.core';

const DRAFTS_DIRECTORY = 'etat/brouillons';

function readChangedDraft(outcome: DraftStatusOutcome): Draft {
  if (outcome.kind === 'not-found') throw new TalosError('draft-not-found');
  if (outcome.kind === 'conflict') throw new TalosError('draft-status-conflict');
  return outcome.draft;
}

// @FollowsBlueprint service-orchestration
export async function listDrafts(): Promise<Draft[]> {
  const files = (await listContentDirectory(DRAFTS_DIRECTORY)).filter(isDraftFile);
  return selectDrafts(await readContentFiles(files));
}

interface DraftChange {
  readonly slug: string;
  readonly target: DraftStatusChange;
  readonly now: Date;
}

async function editStoredDraft(
  change: DraftChange,
  editor: FileEditor<DraftStatusOutcome>,
): Promise<DraftStatusOutcome> {
  const memorySlug = stripMarkdownExtension(buildDraftPath(change.slug));
  const fileEdit = editor(await renderMemoryDraft(memorySlug));
  if (fileEdit.content === null) return fileEdit.outcome;
  const today = formatParisDate(change.now);
  await recordPwaChanges(
    fileEdit.commitMessage,
    [
      {
        op: 'draft.status',
        slug: memorySlug,
        ...planStoredDraftStatus(change.target, today),
      },
    ],
    change.now,
  );
  return fileEdit.outcome;
}

export async function changeDraftStatus(change: DraftChange): Promise<Draft> {
  const today = formatParisDate(change.now);
  const editor: FileEditor<DraftStatusOutcome> = (current) =>
    changeDraftStatusFile(change.slug, current, { target: change.target, today });
  if (await isMemoryInDatabase()) return readChangedDraft(await editStoredDraft(change, editor));
  return readChangedDraft(await editContentFile(buildDraftPath(change.slug), editor));
}
