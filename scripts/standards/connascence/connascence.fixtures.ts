import type { SourceFile } from './connascence.types';

export function sourceFile(path: string, container: string, context: string | null): SourceFile {
  return { path, workspace: 'apps/pragma', container, context, imports: [] };
}

export const SONGS_CONTROLLER = sourceFile(
  'apps/pragma/api/src/songs/songs.controller.ts',
  'api',
  'songs',
);
export const SONGS_SERVICE = sourceFile(
  'apps/pragma/api/src/songs/songs.service.ts',
  'api',
  'songs',
);
export const BARS_SERVICE = sourceFile('apps/pragma/api/src/bars/bars.service.ts', 'api', 'bars');
export const CATALOG_PAGE = sourceFile(
  'apps/pragma/site/src/routes/CatalogPage.tsx',
  'site',
  'routes',
);
export const RANKING_CONTROLLER = sourceFile(
  'apps/pragma/api/src/ranking/ranking.controller.ts',
  'api',
  'ranking',
);
export const STANDINGS_QUERIES = sourceFile(
  'apps/pragma/site/src/lib/queries/standings.ts',
  'site',
  'lib',
);

export const INDEX: ReadonlyMap<string, SourceFile> = new Map(
  [SONGS_CONTROLLER, SONGS_SERVICE, BARS_SERVICE, CATALOG_PAGE].map((each) => [each.path, each]),
);

export const TIMING_INDEX: ReadonlyMap<string, SourceFile> = new Map(
  [...INDEX.values(), RANKING_CONTROLLER, STANDINGS_QUERIES].map((each) => [each.path, each]),
);
