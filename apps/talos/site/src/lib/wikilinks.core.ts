import { stripMarkdownExtension } from '@domain/markdown-page.core';

const PAGE_ROUTE_PREFIX = '/brain/page/';
const MARKDOWN_EXTENSION = '.md';
const WIKILINK_PATTERN = /\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;
const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;
const LEADING_SLASHES_PATTERN = /^\/+/;
const ANCHOR_PATTERN = /#.*$/s;
const PATH_SEPARATOR = '/';
const SLUG_SEPARATOR = '-';
const DISPLAY_LANGUAGE = 'fr';

export function normalisePagePath(target: string): string {
  return stripMarkdownExtension(
    target.replace(ANCHOR_PATTERN, '').trim().replace(LEADING_SLASHES_PATTERN, ''),
  );
}

// @FollowsBlueprint core-view-projection
export function buildPageHref(pagePath: string): string {
  return `${PAGE_ROUTE_PREFIX}${encodeURI(normalisePagePath(pagePath))}`;
}

export function selectPageLabel(pagePath: string): string {
  const normalised = normalisePagePath(pagePath);
  return normalised.slice(normalised.lastIndexOf(PATH_SEPARATOR) + 1);
}

export function selectPageName(pagePath: string): string {
  return selectPageLabel(pagePath)
    .split(SLUG_SEPARATOR)
    .filter((word) => word !== '')
    .map((word) => `${word.charAt(0).toLocaleUpperCase(DISPLAY_LANGUAGE)}${word.slice(1)}`)
    .join(' ');
}

export function convertWikilinksToMarkdown(markdown: string): string {
  return markdown.replaceAll(
    WIKILINK_PATTERN,
    (_match, target: string, _anchor: string | undefined, label: string | undefined) =>
      `[${(label ?? selectPageLabel(target)).trim()}](${buildPageHref(target)})`,
  );
}

export function selectInAppPath(href: string): string | null {
  if (href.startsWith(PAGE_ROUTE_PREFIX)) return href;
  const isRepositoryFile =
    !SCHEME_PATTERN.test(href) && !href.startsWith('#') && href.endsWith(MARKDOWN_EXTENSION);
  return isRepositoryFile ? buildPageHref(href) : null;
}
