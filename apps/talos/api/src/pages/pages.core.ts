import { listWikilinkTargets, summarizePage } from '@domain/markdown-page.core';

export interface Page {
  readonly path: string;
  readonly title: string;
  readonly type: string;
  readonly frontMatter: Record<string, string>;
  readonly markdown: string;
  readonly outgoingLinks: string[];
  readonly incomingLinks: string[];
}

interface MarkdownPage {
  readonly path: string;
  readonly markdown: string;
}

// @FollowsBlueprint core-projection
export function projectPage(page: MarkdownPage, corpus: readonly MarkdownPage[]): Page {
  const summary = summarizePage(page.path, page.markdown);
  return {
    path: summary.path,
    title: summary.title,
    type: summary.type,
    frontMatter: { ...summary.frontMatter },
    markdown: summary.body,
    outgoingLinks: listWikilinkTargets(summary.body),
    incomingLinks: corpus
      .filter((other) => other.path !== page.path)
      .filter((other) => listWikilinkTargets(other.markdown).includes(page.path))
      .map((other) => other.path),
  };
}

export interface StoredPageView {
  readonly slug: string;
  readonly markdown: string;
  readonly outgoing: readonly string[];
  readonly incoming: readonly string[];
}

export function projectStoredPage(view: StoredPageView): Page {
  const summary = summarizePage(view.slug, view.markdown);
  return {
    path: summary.path,
    title: summary.title,
    type: summary.type,
    frontMatter: { ...summary.frontMatter },
    markdown: summary.body,
    outgoingLinks: [...view.outgoing],
    incomingLinks: [...view.incoming],
  };
}
