import {
  listContentDirectory,
  readContentFile,
  readContentFiles,
} from '../content/content.service';
import { TalosError } from '../helpers/errors/talos-error.types';
import { type Brief, buildJournalPath, readBrief } from '../today/today.core';
import {
  buildReviewPath,
  type HistoryIndex,
  isHistoryFile,
  type Review,
  readReview,
  selectHistoryIndex,
} from './history.core';

const JOURNAL_DIRECTORY = 'journal';

// @FollowsBlueprint service-read-model
export async function readHistoryIndex(): Promise<HistoryIndex> {
  const files = (await listContentDirectory(JOURNAL_DIRECTORY)).filter(isHistoryFile);
  return selectHistoryIndex(await readContentFiles(files));
}

export async function readPastBrief(date: string): Promise<Brief> {
  const journal = await readContentFile(buildJournalPath(date));
  const brief = journal === null ? null : readBrief(date, journal);
  if (brief === null) throw new TalosError('brief-not-found');
  return brief;
}

export async function readWeeklyReview(week: string): Promise<Review> {
  const markdown = await readContentFile(buildReviewPath(week));
  if (markdown === null) throw new TalosError('review-not-found');
  return readReview(week, markdown);
}
