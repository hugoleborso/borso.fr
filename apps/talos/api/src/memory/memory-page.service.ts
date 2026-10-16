import { TalosError } from '../helpers/errors/talos-error.types';
import { decodeAttributes } from './memory-changes.core';
import {
  composePageView,
  type MemoryPageView,
  type RenderedPage,
  selectContentPage,
  selectRecord,
} from './memory-page.core';
import { renderEntityPage, renderRecordPage } from './page-rendering.core';
import {
  findCommitment,
  findDraft,
  findEntity,
  findJournalEntry,
  findProposal,
  findSource,
  listFactsOf,
  listRelationsTouching,
  listSlugsLinkingTo,
  type MemoryExecutor,
} from './memory.repository';
import { findDocumentBySlug, readExecutor } from './memory-search.repository';

async function renderEntity(executor: MemoryExecutor, slug: string): Promise<RenderedPage | null> {
  const entity = await findEntity(executor, slug);
  if (entity === null) return null;
  const [facts, relations] = await Promise.all([listFactsOf(slug), listRelationsTouching(slug)]);
  const outgoing = relations.filter((relation) => relation.fromSlug === slug);
  return {
    type: 'entity',
    markdown: renderEntityPage(
      { ...entity, attributes: decodeAttributes(entity.attributes) },
      facts,
      outgoing,
    ),
    targets: outgoing.map((relation) => relation.toSlug),
  };
}

async function renderRecord(executor: MemoryExecutor, slug: string): Promise<RenderedPage | null> {
  const [commitment, proposal, draft] = await Promise.all([
    findCommitment(executor, slug),
    findProposal(executor, slug),
    findDraft(executor, slug),
  ]);
  const selected = selectRecord(commitment, proposal, draft);
  if (selected === null) return null;
  return {
    type: selected.type,
    markdown: renderRecordPage(decodeAttributes(selected.record.attributes), selected.record.body),
    targets: [],
  };
}

async function renderContent(executor: MemoryExecutor, slug: string): Promise<RenderedPage | null> {
  const [source, journal, document] = await Promise.all([
    findSource(executor, slug),
    findJournalEntry(executor, slug),
    findDocumentBySlug(slug),
  ]);
  return selectContentPage(source, journal, document);
}

// @FollowsBlueprint service-read-model
export async function readMemoryPage(slug: string): Promise<MemoryPageView> {
  const executor = readExecutor();
  const rendered =
    (await renderEntity(executor, slug)) ??
    (await renderRecord(executor, slug)) ??
    (await renderContent(executor, slug));
  if (rendered === null)
    throw new TalosError('memory-not-found', { message: `page inconnue : ${slug}` });
  const [relations, linking] = await Promise.all([
    listRelationsTouching(slug),
    listSlugsLinkingTo(slug),
  ]);
  return composePageView(slug, rendered, relations, linking);
}
