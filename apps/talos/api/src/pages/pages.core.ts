import { summarizePage } from '@domain/markdown-page.core';

export interface Page {
  readonly path: string;
  readonly title: string;
  readonly type: string;
  readonly frontMatter: Record<string, string>;
  readonly markdown: string;
  readonly outgoingLinks: string[];
  readonly incomingLinks: string[];
}

export interface StoredPageView {
  readonly slug: string;
  readonly markdown: string;
  readonly outgoing: readonly string[];
  readonly incoming: readonly string[];
}

// @FollowsBlueprint core-projection
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
