import { TalosError } from '../helpers/errors/talos-error.types';
import { decodeAttributes, decodeJsonText } from './memory-changes.core';
import {
  listDirectoryFiles,
  locateMemoryFile,
  type MemoryFileAddress,
  type MemoryFileKind,
  renderStateFile,
  selectDirectoryKind,
} from './memory-files.core';
import {
  listDrafts,
  listJournalEntriesIn,
  listJournalSlugs,
  listProposals,
} from './memory-files.repository';
import { readMemoryPage } from './memory-page.service';
import { listCommitments, listStates } from './memory.repository';
import { renderRecordPage } from './page-rendering.core';

interface RecordRow {
  readonly slug: string;
  readonly attributes: string;
  readonly body: string;
}

type RenderedFiles = ReadonlyMap<string, string>;

function renderRecords(rows: readonly RecordRow[]): RenderedFiles {
  return new Map(
    rows.map((row) => [row.slug, renderRecordPage(decodeAttributes(row.attributes), row.body)]),
  );
}

async function readPageMarkdown(slug: string): Promise<string | null> {
  try {
    return (await readMemoryPage(slug)).markdown;
  } catch (error) {
    if (error instanceof TalosError && error.code === 'memory-not-found') return null;
    throw error;
  }
}

async function renderPages(slugs: readonly string[]): Promise<RenderedFiles> {
  const pages = await Promise.all(
    slugs.map(async (slug) => [slug, await readPageMarkdown(slug)] as const),
  );
  return new Map(pages.filter((page): page is readonly [string, string] => page[1] !== null));
}

async function renderStates(keys: readonly string[]): Promise<RenderedFiles> {
  const states = await listStates(keys);
  return new Map(states.map((state) => [state.key, renderStateFile(decodeJsonText(state.value))]));
}

async function renderJournalEntries(slugs: readonly string[]): Promise<RenderedFiles> {
  const journalEntries = await listJournalEntriesIn(slugs);
  return new Map(journalEntries.map((entry) => [entry.slug, entry.content]));
}

const RENDERERS: Record<MemoryFileKind, (keys: readonly string[]) => Promise<RenderedFiles>> = {
  proposal: async () => renderRecords(await listProposals()),
  draft: async () => renderRecords(await listDrafts()),
  commitment: async () => renderRecords(await listCommitments()),
  journal: renderJournalEntries,
  state: renderStates,
  page: renderPages,
};

const SLUG_LISTERS: Partial<Record<MemoryFileKind, () => Promise<string[]>>> = {
  proposal: async () => (await listProposals()).map((row) => row.slug),
  draft: async () => (await listDrafts()).map((row) => row.slug),
  commitment: async () => (await listCommitments()).map((row) => row.slug),
  journal: listJournalSlugs,
};

async function renderKind(
  kind: MemoryFileKind,
  addresses: readonly MemoryFileAddress[],
): Promise<RenderedFiles> {
  const keys = addresses.filter((address) => address.kind === kind).map((address) => address.key);
  return keys.length === 0 ? new Map() : await RENDERERS[kind](keys);
}

// @FollowsBlueprint service-read-model
export async function readMemoryFiles(paths: readonly string[]): Promise<RenderedFiles> {
  const located = paths.flatMap((path) => {
    const address = locateMemoryFile(path);
    return address === null ? [] : [{ path, address }];
  });
  const addresses = located.map((entry) => entry.address);
  const kinds = [...new Set(addresses.map((address) => address.kind))];
  const rendered = new Map(
    await Promise.all(
      kinds.map(async (kind) => [kind, await renderKind(kind, addresses)] as const),
    ),
  );
  return new Map(
    located.flatMap(({ path, address }) => {
      const content = rendered.get(address.kind)?.get(address.key);
      return content === undefined ? [] : [[path, content] as const];
    }),
  );
}

export async function readMemoryFile(path: string): Promise<string | null> {
  return (await readMemoryFiles([path])).get(path) ?? null;
}

export async function listMemoryDirectory(directory: string): Promise<string[]> {
  const kind = selectDirectoryKind(directory);
  const lister = kind === null ? undefined : SLUG_LISTERS[kind];
  return lister === undefined ? [] : listDirectoryFiles(directory, await lister());
}
