import { readSection, summarizePage } from '@domain/markdown-page.core';
import { CONTAINED_HEADING, HEADING_PREFIXES } from '../memory/computed-sections.core';

export interface Page {
  readonly path: string;
  readonly title: string;
  readonly type: string;
  readonly frontMatter: Record<string, string>;
  readonly markdown: string;
  readonly outgoingLinks: string[];
  readonly incomingLinks: string[];
  readonly summarizedOn: string | null;
}

export interface StoredPageView {
  readonly slug: string;
  readonly markdown: string;
  readonly outgoing: readonly string[];
  readonly incoming: readonly string[];
  readonly summarizedOn: string | null;
}

const LINE_BREAK = '\n';
const HAND_WRITTEN_COPY_HEADING = 'Projets liés';

function isHeading(line: string): boolean {
  return HEADING_PREFIXES.some((prefix) => line.startsWith(prefix));
}

function removeSection(body: string, heading: string): string {
  const lines = body.split(LINE_BREAK);
  const headingIndex = lines.findIndex((line) => line.trimEnd() === `## ${heading}`);
  if (headingIndex === -1) return body;
  const sectionLength = lines.slice(headingIndex + 1).findIndex(isHeading);
  const following = sectionLength === -1 ? [] : lines.slice(headingIndex + 1 + sectionLength);
  return [...lines.slice(0, headingIndex), ...following].join(LINE_BREAK);
}

export function hideHandWrittenCopy(body: string): string {
  const contained = readSection(body, CONTAINED_HEADING);
  const hasComputedContainment = contained !== null && contained !== '';
  return hasComputedContainment ? removeSection(body, HAND_WRITTEN_COPY_HEADING) : body;
}

// @FollowsBlueprint core-projection
export function projectStoredPage(view: StoredPageView): Page {
  const summary = summarizePage(view.slug, view.markdown);
  return {
    path: summary.path,
    title: summary.title,
    type: summary.type,
    frontMatter: { ...summary.frontMatter },
    markdown: hideHandWrittenCopy(summary.body),
    outgoingLinks: [...view.outgoing],
    incomingLinks: [...view.incoming],
    summarizedOn: view.summarizedOn,
  };
}
