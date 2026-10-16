import { listWikilinkTargets } from '@domain/markdown-page.core';
import type { MemoryObjectType } from './memory-search.core';

export interface MemoryPageView {
  readonly slug: string;
  readonly type: MemoryObjectType;
  readonly markdown: string;
  readonly outgoing: string[];
  readonly incoming: string[];
}

export interface RenderedPage {
  readonly type: MemoryObjectType;
  readonly markdown: string;
  readonly targets: readonly string[];
}

interface RecordWithBody {
  readonly attributes: string;
  readonly body: string;
}

interface ContentRow {
  readonly content: string;
}

export interface SelectedRecord {
  readonly type: MemoryObjectType;
  readonly record: RecordWithBody;
}

export function selectRecord(
  commitment: RecordWithBody | null,
  proposal: RecordWithBody | null,
  draft: RecordWithBody | null,
): SelectedRecord | null {
  if (commitment !== null) return { type: 'commitment', record: commitment };
  if (proposal !== null) return { type: 'proposal', record: proposal };
  if (draft !== null) return { type: 'draft', record: draft };
  return null;
}

export function selectContentPage(
  source: ContentRow | null,
  journal: ContentRow | null,
  document: ContentRow | null,
): RenderedPage | null {
  if (source !== null) return { type: 'source', markdown: source.content, targets: [] };
  if (journal !== null) return { type: 'journal', markdown: journal.content, targets: [] };
  if (document !== null) return { type: 'document', markdown: document.content, targets: [] };
  return null;
}

// @FollowsBlueprint core-projection
export function composePageView(
  slug: string,
  rendered: RenderedPage,
  relations: readonly { readonly fromSlug: string; readonly toSlug: string }[],
  linking: readonly string[],
): MemoryPageView {
  const outgoing = new Set([...listWikilinkTargets(rendered.markdown), ...rendered.targets]);
  const incoming = new Set([
    ...relations
      .filter((relation) => relation.toSlug === slug)
      .map((relation) => relation.fromSlug),
    ...linking,
  ]);
  outgoing.delete(slug);
  incoming.delete(slug);
  return {
    slug,
    type: rendered.type,
    markdown: rendered.markdown,
    outgoing: [...outgoing].toSorted(),
    incoming: [...incoming].toSorted(),
  };
}
