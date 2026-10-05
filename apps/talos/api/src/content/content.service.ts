import { stripMarkdownExtension } from '@domain/markdown-page.core';
import { resolveContentStore } from './content-store.setup';
import { isCorpusFile } from './content.core';
import type { FileEditor } from './content.types';

export type { FileEdit, FileEditor } from './content.types';
export { isReadablePagePath } from './content.core';

export interface CorpusPage {
  readonly path: string;
  readonly markdown: string;
}

// @FollowsBlueprint service-passthrough
export async function readContentFile(path: string): Promise<string | null> {
  return await resolveContentStore().readFile(path);
}

export async function listContentDirectory(directory: string): Promise<string[]> {
  return await resolveContentStore().listDirectory(directory);
}

export async function readContentFiles(
  paths: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  return await resolveContentStore().readFiles(paths);
}

export async function editContentFile<Outcome>(
  path: string,
  editor: FileEditor<Outcome>,
): Promise<Outcome> {
  return await resolveContentStore().editFile(path, editor);
}

export async function readPageCorpus(): Promise<CorpusPage[]> {
  const store = resolveContentStore();
  const files = (await store.listFiles()).filter(isCorpusFile);
  const contents = await store.readFiles(files);
  return [...contents].map(([file, markdown]) => ({
    path: stripMarkdownExtension(file),
    markdown,
  }));
}
