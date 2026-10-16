import { stripMarkdownExtension } from '@domain/markdown-page.core';
import { TalosError } from '../helpers/errors/talos-error.types';
import { isMemoryInDatabase } from '../memory/memory-cutover.service';
import {
  listMemoryDirectory,
  readMemoryFile,
  readMemoryFiles,
} from '../memory/memory-files.service';
import { resolveContentStore } from './content-store.setup';
import { isCorpusFile } from './content.core';
import type { FileEditor } from './content.types';

export type { FileEdit, FileEditor } from './content.types';
export { isReadablePagePath } from './content.core';

export interface CorpusPage {
  readonly path: string;
  readonly markdown: string;
}

async function refuseGitOnceInDatabase(): Promise<void> {
  if (await isMemoryInDatabase()) throw new TalosError('content-moved');
}

// @FollowsBlueprint service-passthrough
export async function readContentFile(path: string): Promise<string | null> {
  if (await isMemoryInDatabase()) return await readMemoryFile(path);
  return await resolveContentStore().readFile(path);
}

export async function listContentDirectory(directory: string): Promise<string[]> {
  if (await isMemoryInDatabase()) return await listMemoryDirectory(directory);
  return await resolveContentStore().listDirectory(directory);
}

export async function readContentFiles(
  paths: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  if (await isMemoryInDatabase()) return await readMemoryFiles(paths);
  return await resolveContentStore().readFiles(paths);
}

export async function editContentFile<Outcome>(
  path: string,
  editor: FileEditor<Outcome>,
): Promise<Outcome> {
  await refuseGitOnceInDatabase();
  return await resolveContentStore().editFile(path, editor);
}

export async function readPageCorpus(): Promise<CorpusPage[]> {
  await refuseGitOnceInDatabase();
  const store = resolveContentStore();
  const files = (await store.listFiles()).filter(isCorpusFile);
  const contents = await store.readFiles(files);
  return [...contents].map(([file, markdown]) => ({
    path: stripMarkdownExtension(file),
    markdown,
  }));
}
