import { splitFrontMatter } from '@domain/front-matter.core';
import { readPageTitle } from '@domain/markdown-page.core';
import { readCapture } from '@domain/text.core';
import { readBrief } from '../today/today.core';

export interface BriefEntry {
  readonly date: string;
}

export interface ReviewEntry {
  readonly week: string;
  readonly title: string;
}

export interface HistoryIndex {
  readonly briefs: BriefEntry[];
  readonly reviews: ReviewEntry[];
}

export interface Review extends ReviewEntry {
  readonly markdown: string;
}

const JOURNAL_DIRECTORY = 'journal';
const PATH_SEPARATOR = '/';
const BRIEF_FILE_PATTERN = /^(?<date>\d{4}-\d{2}-\d{2})\.md$/;
const REVIEW_FILE_PATTERN = /^(?<week>\d{4}-S\d{2})-hebdo\.md$/;

function readFileName(path: string): string {
  return path.slice(path.lastIndexOf(PATH_SEPARATOR) + 1);
}

export function isHistoryFile(path: string): boolean {
  const name = readFileName(path);
  return BRIEF_FILE_PATTERN.test(name) || REVIEW_FILE_PATTERN.test(name);
}

export function buildReviewPath(week: string): string {
  return `${JOURNAL_DIRECTORY}/${week}-hebdo.md`;
}

export function readReview(week: string, markdown: string): Review {
  return { week, title: readPageTitle(splitFrontMatter(markdown).body, week), markdown };
}

function readBriefEntry(path: string, journal: string): BriefEntry | null {
  const match = BRIEF_FILE_PATTERN.exec(readFileName(path));
  if (match === null) return null;
  const date = readCapture(match, 'date');
  return readBrief(date, journal) === null ? null : { date };
}

function readReviewEntry(path: string, markdown: string): ReviewEntry | null {
  const match = REVIEW_FILE_PATTERN.exec(readFileName(path));
  if (match === null) return null;
  const { week, title } = readReview(readCapture(match, 'week'), markdown);
  return { week, title };
}

// @FollowsBlueprint core-projection
export function selectHistoryIndex(files: ReadonlyMap<string, string>): HistoryIndex {
  const journalFiles = [...files];
  return {
    briefs: journalFiles
      .map(([path, journal]) => readBriefEntry(path, journal))
      .filter((entry) => entry !== null)
      .toSorted((left, right) => right.date.localeCompare(left.date)),
    reviews: journalFiles
      .map(([path, markdown]) => readReviewEntry(path, markdown))
      .filter((entry) => entry !== null)
      .toSorted((left, right) => right.week.localeCompare(left.week)),
  };
}
