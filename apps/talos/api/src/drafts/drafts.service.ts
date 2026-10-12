import type { DraftStatusChange } from '@domain/draft-status.core';
import {
  editContentFile,
  listContentDirectory,
  readContentFiles,
} from '../content/content.service';
import { formatParisDate } from '../helpers/calendar/paris-clock.utils';
import { TalosError } from '../helpers/errors/talos-error.types';
import {
  buildDraftPath,
  changeDraftStatusFile,
  type Draft,
  type DraftStatusOutcome,
  isDraftFile,
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

export async function changeDraftStatus(params: {
  readonly slug: string;
  readonly target: DraftStatusChange;
  readonly now: Date;
}): Promise<Draft> {
  const change = { target: params.target, today: formatParisDate(params.now) };
  const outcome = await editContentFile(buildDraftPath(params.slug), (current) =>
    changeDraftStatusFile(params.slug, current, change),
  );
  return readChangedDraft(outcome);
}
