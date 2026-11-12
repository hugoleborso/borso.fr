import { formatParisDate } from '../helpers/calendar/paris-clock.utils';
import { TalosError } from '../helpers/errors/talos-error.types';
import {
  composeComputedSections,
  type ContainmentRelation,
  RECENT_FACT_LIMIT,
  selectContainedSlugs,
  selectDescendantSlugs,
  selectRecentWindowStart,
  selectSummaryDay,
} from './computed-sections.core';
import { decodeAttributes } from './memory-changes.core';
import {
  listEntitiesIn,
  listRecentFactsOfEntities,
  listRelationsFrom,
} from './memory-containment.repository';
import {
  composePageView,
  type MemoryPageView,
  type RenderedPage,
  selectContentPage,
  type SummarizedPageView,
  selectRecord,
} from './memory-page.core';
import { type ComputedSection, renderEntityPage, renderRecordPage } from './page-rendering.core';
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

async function readComputedSections(
  slug: string,
  outgoing: readonly ContainmentRelation[],
  summarizedOn: string | null,
): Promise<ComputedSection[]> {
  const containedSlugs = selectContainedSlugs(outgoing);
  if (containedSlugs.length === 0) return [];
  const [containedEntities, relationsOfContained] = await Promise.all([
    listEntitiesIn(containedSlugs),
    listRelationsFrom(containedSlugs),
  ]);
  const windowStart = selectRecentWindowStart(summarizedOn, formatParisDate(new Date()));
  const descendantFacts = await listRecentFactsOfEntities(
    selectDescendantSlugs(slug, containedSlugs, relationsOfContained),
    windowStart,
    RECENT_FACT_LIMIT,
  );
  return composeComputedSections({
    containedSlugs,
    containedEntities: containedEntities.map((contained) => ({
      ...contained,
      attributes: decodeAttributes(contained.attributes),
    })),
    descendantFacts,
    windowStart,
  });
}

async function renderEntity(executor: MemoryExecutor, slug: string): Promise<RenderedPage | null> {
  const entity = await findEntity(executor, slug);
  if (entity === null) return null;
  const [facts, relations] = await Promise.all([listFactsOf(slug), listRelationsTouching(slug)]);
  const outgoing = relations.filter((relation) => relation.fromSlug === slug);
  const attributes = decodeAttributes(entity.attributes);
  const summarizedOn = selectSummaryDay(attributes, entity.updatedAt);
  const computedSections = await readComputedSections(slug, outgoing, summarizedOn);
  return {
    type: 'entity',
    markdown: renderEntityPage({ ...entity, attributes }, facts, outgoing, computedSections),
    targets: outgoing.map((relation) => relation.toSlug),
    summarizedOn,
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
    summarizedOn: null,
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
export async function readSummarizedMemoryPage(slug: string): Promise<SummarizedPageView> {
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
  return {
    ...composePageView(slug, rendered, relations, linking),
    summarizedOn: rendered.summarizedOn,
  };
}

export async function readMemoryPage(slug: string): Promise<MemoryPageView> {
  const { summarizedOn: _summarizedOn, ...page } = await readSummarizedMemoryPage(slug);
  return page;
}
