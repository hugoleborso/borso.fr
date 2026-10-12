import { readTalosSecret } from '../helpers/secrets/secrets.setup';
import type { ContentStore } from './content.types';
import { createGithubContentStore } from './github.adapter';

const REPOSITORY_VARIABLE = 'GITHUB_REPO';
const DEFAULT_REPOSITORY = 'hugoleborso/talos';

interface ContentStoreHolder {
  chosen: ContentStore | null;
  fromEnvironment: ContentStore | null;
}

const holder: ContentStoreHolder = { chosen: null, fromEnvironment: null };

export function useContentStore(store: ContentStore): void {
  holder.chosen = store;
}

export function readContentRepository(): string {
  return process.env[REPOSITORY_VARIABLE] ?? DEFAULT_REPOSITORY;
}

// @FollowsBlueprint adapter-chosen-by-the-composition-root
export function resolveContentStore(): ContentStore {
  if (holder.chosen !== null) return holder.chosen;
  holder.fromEnvironment ??= createGithubContentStore({
    repository: readContentRepository(),
    readToken: async () => await readTalosSecret('github-token'),
  });
  return holder.fromEnvironment;
}
