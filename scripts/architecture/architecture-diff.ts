/**
 * Compares two architecture models and prints what moved, as markdown.
 *
 * ```
 * pnpm exec tsx scripts/architecture/architecture-diff.ts <base.json> <head.json>
 * ```
 *
 * The point is a reviewer reading one screen instead of a generated HTML diff.
 * Architecture changes worth a second look are the ones this reports: a route
 * appearing or vanishing, a route reaching a table or an external system it did
 * not reach before, a file changing layer, a new external system, and a route
 * losing its last caller.
 *
 * Exits 0 whether or not anything changed. This describes a diff for a human;
 * it is not a gate, and `architecture-graph.ts --check` is the gate.
 */

import { readFileSync } from 'node:fs';
import { z } from 'zod';

const routeSchema = z.object({
  id: z.string(),
  context: z.string(),
  steps: z.array(z.string()),
  tables: z.array(z.string()),
  externals: z.array(z.string()),
  callerCount: z.number(),
  unreached: z.boolean(),
});

const fileSchema = z.object({
  path: z.string(),
  container: z.string(),
  layer: z.string(),
  context: z.string(),
  feature: z.string().nullable(),
  exports: z.array(z.string()),
  imports: z.array(z.string()),
  blueprints: z.array(z.string()),
  followsBlueprints: z.array(z.string()),
});

const architectureModelSchema = z.object({
  application: z.string(),
  containers: z.array(z.object({ id: z.string(), name: z.string(), fileCount: z.number() })),
  externals: z.array(
    z.object({ id: z.string(), name: z.string(), reachedFrom: z.array(z.string()) }),
  ),
  files: z.array(fileSchema),
  routes: z.array(routeSchema),
  blueprints: z.array(z.object({ id: z.string(), file: z.string(), followerCount: z.number() })),
});

type ArchitectureModel = z.infer<typeof architectureModelSchema>;
type RouteEntry = z.infer<typeof routeSchema>;
type FileEntry = z.infer<typeof fileSchema>;

/**
 * The models this reads are written by `architecture-graph.ts` one job earlier,
 * so the shape is known. Parsing rather than trusting is what turns a truncated
 * or half-written file into a clear error instead of a diff full of phantom
 * removals.
 */
function readModel(path: string): ArchitectureModel {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const result = architectureModelSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`${path} is not an architecture model: ${result.error.message}`);
  }
  return result.data;
}

function listChanges<T>(
  base: readonly T[],
  head: readonly T[],
  keyOf: (entry: T) => string,
): { added: T[]; removed: T[]; common: { before: T; after: T }[] } {
  const baseByKey = new Map(base.map((entry) => [keyOf(entry), entry]));
  const headByKey = new Map(head.map((entry) => [keyOf(entry), entry]));
  const added = head.filter((entry) => !baseByKey.has(keyOf(entry)));
  const removed = base.filter((entry) => !headByKey.has(keyOf(entry)));
  const common = head.flatMap((entry) => {
    const before = baseByKey.get(keyOf(entry));
    return before === undefined ? [] : [{ before, after: entry }];
  });
  return { added, removed, common };
}

/**
 * A section long enough to bury the rest of the report is worse than a count.
 * A rename or a new tag can move every route at once, and a reviewer needs to
 * see that it happened, not read it fifty times.
 */
const MAXIMUM_LINES_PER_SECTION = 15;

function bullet(lines: readonly string[]): string {
  const shown = lines.slice(0, MAXIMUM_LINES_PER_SECTION).map((line) => `- ${line}`);
  const hidden = lines.length - shown.length;
  return [...shown, ...(hidden > 0 ? [`- …and ${hidden} more`] : [])].join('\n');
}

function section(title: string, body: string): string {
  return body === '' ? '' : `\n### ${title}\n\n${body}\n`;
}

function describeRoute(route: RouteEntry): string {
  const reaches = [
    route.tables.length > 0 ? `tables ${route.tables.join(', ')}` : '',
    route.externals.length > 0 ? `external ${route.externals.join(', ')}` : '',
  ]
    .filter((part) => part !== '')
    .join('; ');
  return `\`${route.id}\` in **${route.context}**${reaches === '' ? '' : ` — ${reaches}`}`;
}

function main(): void {
  const [basePath, headPath] = process.argv.slice(2);
  if (basePath === undefined || headPath === undefined) {
    console.error('Usage: architecture-diff.ts <base.json> <head.json>');
    process.exit(2);
  }

  const base = readModel(basePath);
  const head = readModel(headPath);

  const routes = listChanges<RouteEntry>(base.routes, head.routes, (route) => route.id);
  const files = listChanges<FileEntry>(base.files, head.files, (file) => file.path);
  const externals = listChanges(base.externals, head.externals, (external) => external.id);
  const blueprints = listChanges(base.blueprints, head.blueprints, (entry) => entry.id);

  const reachChanges = routes.common
    .filter(
      ({ before, after }) =>
        before.tables.join() !== after.tables.join() ||
        before.externals.join() !== after.externals.join(),
    )
    .map(
      ({ before, after }) =>
        `\`${after.id}\` now reaches ${[...after.tables, ...after.externals].join(', ') || 'nothing'} (was ${[...before.tables, ...before.externals].join(', ') || 'nothing'})`,
    );

  const newlyUnreached = routes.common
    .filter(({ before, after }) => !before.unreached && after.unreached)
    .map(({ after }) => `\`${after.id}\` lost its last caller`);

  const nowReached = routes.common
    .filter(({ before, after }) => before.unreached && !after.unreached)
    .map(({ after }) => `\`${after.id}\` is now called (${after.callerCount})`);

  const layerMoves = files.common
    .filter(
      ({ before, after }) => before.layer !== after.layer || before.container !== after.container,
    )
    .map(
      ({ before, after }) =>
        `\`${after.path.replace('apps/pragma/', '')}\`: ${before.container}/${before.layer} → ${after.container}/${after.layer}`,
    );

  const body = [
    section('Routes added', bullet(routes.added.map((route) => describeRoute(route)))),
    section('Routes removed', bullet(routes.removed.map((route) => describeRoute(route)))),
    section('Routes reaching something new', bullet(reachChanges)),
    section('Routes with no caller left', bullet(newlyUnreached)),
    section('Routes newly called', bullet(nowReached)),
    section(
      'External systems added',
      bullet(externals.added.map((each) => `\`${each.id}\` (${each.name})`)),
    ),
    section('External systems removed', bullet(externals.removed.map((each) => `\`${each.id}\``))),
    section('Files that changed layer', bullet(layerMoves)),
    section(
      'Files added',
      bullet(
        files.added.map(
          (file) =>
            `\`${file.path.replace('apps/pragma/', '')}\` (${file.container}/${file.layer})`,
        ),
      ),
    ),
    section(
      'Files removed',
      bullet(files.removed.map((file) => `\`${file.path.replace('apps/pragma/', '')}\``)),
    ),
    section('Blueprints added', bullet(blueprints.added.map((each) => `\`${each.id}\``))),
    section('Blueprints removed', bullet(blueprints.removed.map((each) => `\`${each.id}\``))),
  ]
    .filter((part) => part !== '')
    .join('');

  const unreachedNow = head.routes.filter((route) => route.unreached).length;
  const summary = [
    `**${head.files.length}** files`,
    `**${head.routes.length}** routes`,
    `**${unreachedNow}** with no caller`,
    `**${head.blueprints.length}** blueprints`,
  ].join(' · ');

  console.log('## Architecture');
  console.log('');
  console.log(summary);
  if (body === '') {
    console.log('');
    console.log('No architectural change against the target branch.');
    return;
  }
  console.log(body);
}

main();
