import { TalosError } from '../helpers/errors/talos-error.types';
import { readMemoryPage } from '../memory/memory-pwa.service';
import { type Page, projectStoredPage } from './pages.core';

// @FollowsBlueprint service-read-model
export async function readPage(slug: string): Promise<Page> {
  try {
    return projectStoredPage(await readMemoryPage(slug));
  } catch (error) {
    if (error instanceof TalosError && error.code === 'memory-not-found') {
      throw new TalosError('page-not-found');
    }
    throw error;
  }
}
