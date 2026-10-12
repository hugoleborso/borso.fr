import { isReadablePagePath, readContentFile, readPageCorpus } from '../content/content.service';
import { TalosError } from '../helpers/errors/talos-error.types';
import { type Page, projectPage } from './pages.core';

// @FollowsBlueprint service-read-model
export async function readPage(path: string): Promise<Page> {
  if (!isReadablePagePath(path)) throw new TalosError('page-not-found');
  const [markdown, corpus] = await Promise.all([readContentFile(`${path}.md`), readPageCorpus()]);
  if (markdown === null) throw new TalosError('page-not-found');
  return projectPage({ path, markdown }, corpus);
}
