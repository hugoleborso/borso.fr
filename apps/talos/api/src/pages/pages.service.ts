import { isReadablePagePath, readContentFile, readPageCorpus } from '../content/content.service';
import { TalosError } from '../helpers/errors/talos-error.types';
import { isMemoryInDatabase } from '../memory/memory-cutover.service';
import { readMemoryPage } from '../memory/memory-pwa.service';
import { type Page, projectPage, projectStoredPage } from './pages.core';

async function readStoredPage(slug: string): Promise<Page> {
  try {
    return projectStoredPage(await readMemoryPage(slug));
  } catch (error) {
    if (error instanceof TalosError && error.code === 'memory-not-found') {
      throw new TalosError('page-not-found');
    }
    throw error;
  }
}

// @FollowsBlueprint service-read-model
export async function readPage(path: string): Promise<Page> {
  if (await isMemoryInDatabase()) return await readStoredPage(path);
  if (!isReadablePagePath(path)) throw new TalosError('page-not-found');
  const [markdown, corpus] = await Promise.all([readContentFile(`${path}.md`), readPageCorpus()]);
  if (markdown === null) throw new TalosError('page-not-found');
  return projectPage({ path, markdown }, corpus);
}
