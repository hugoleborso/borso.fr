import { splitFrontMatter } from './front-matter.core';
import { readCapture } from './text.core';

const LINE_BREAK = '\n';
const TITLE_PREFIX = '# ';
const SECTION_PREFIX = '## ';
const MARKDOWN_EXTENSION = '.md';
const DEFAULT_PAGE_TYPE = 'page';
const PATH_SEPARATOR = '/';
const WIKILINK_PATTERN = /\[\[(?<target>[^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;

export interface PageSummary {
  readonly path: string;
  readonly title: string;
  readonly type: string;
  readonly frontMatter: Readonly<Record<string, string>>;
  readonly body: string;
}

export function readPageTitle(body: string, fallback: string): string {
  const titleLine = body.split(LINE_BREAK).find((line) => line.startsWith(TITLE_PREFIX));
  const title = titleLine?.slice(TITLE_PREFIX.length).trim() ?? '';
  return title === '' ? fallback : title;
}

export function stripMarkdownExtension(path: string): string {
  return path.endsWith(MARKDOWN_EXTENSION) ? path.slice(0, -MARKDOWN_EXTENSION.length) : path;
}

// @FollowsBlueprint core-parse-untrusted
export function listWikilinkTargets(markdown: string): string[] {
  const targets = [...markdown.matchAll(WIKILINK_PATTERN)].map((match) =>
    stripMarkdownExtension(readCapture(match, 'target').trim()),
  );
  return [...new Set(targets)];
}

function isHeadingAtOrAbove(line: string): boolean {
  return line.startsWith(SECTION_PREFIX) || line.startsWith(TITLE_PREFIX);
}

export function readSection(body: string, heading: string): string | null {
  const lines = body.split(LINE_BREAK);
  const headingIndex = lines.findIndex((line) => line.trimEnd() === `${SECTION_PREFIX}${heading}`);
  if (headingIndex === -1) return null;
  const following = lines.slice(headingIndex + 1);
  const nextHeadingIndex = following.findIndex(isHeadingAtOrAbove);
  const sectionLines = nextHeadingIndex === -1 ? following : following.slice(0, nextHeadingIndex);
  return sectionLines.join(LINE_BREAK).trim();
}

// @FollowsBlueprint core-projection
export function summarizePage(path: string, markdown: string): PageSummary {
  const { frontMatter, body } = splitFrontMatter(markdown);
  return {
    path,
    title: readPageTitle(body, path.slice(path.lastIndexOf(PATH_SEPARATOR) + 1)),
    type: frontMatter.type ?? DEFAULT_PAGE_TYPE,
    frontMatter,
    body,
  };
}
