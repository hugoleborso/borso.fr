import { splitFrontMatter } from '@domain/front-matter.core';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { convertWikilinksToMarkdown } from './wikilinks.core';

// @FollowsBlueprint utils-pure-module
export function renderMarkdownToSafeHtml(markdown: string): string {
  const html = marked.parse(convertWikilinksToMarkdown(splitFrontMatter(markdown).body), {
    async: false,
    breaks: true,
  });
  return DOMPurify.sanitize(html);
}
