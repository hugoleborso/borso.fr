import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * Stryker's entry point. It holds no test settings of its own: an `include`
 * written here is discarded the moment a workspace is in play, and one always
 * is. `vitest.mutation.workspace.ts` carries the projects.
 */
export default defineConfig({
  test: { workspace: fromHere('./vitest.mutation.workspace.ts') },
});
