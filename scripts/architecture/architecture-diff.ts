/**
 * Compares two architecture models and reports what moved.
 *
 * ```
 * pnpm exec tsx scripts/architecture/architecture-diff.ts <base.json> <head.json>
 * pnpm exec tsx scripts/architecture/architecture-diff.ts <base.json> <head.json> --html <out.html>
 * ```
 *
 * Markdown on stdout for the pull-request comment, and a self-contained page
 * with `--html` for a reader who wants to look at the change rather than scroll
 * a comment.
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

import { readFileSync, writeFileSync } from 'node:fs';

import {
  architectureModelSchema,
  type ArchitectureModel,
  type FileEntry,
  type RouteEntry,
} from './architecture-model-json';

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

interface ReportSection {
  readonly title: string;
  readonly lines: readonly string[];
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Backticks and bold, which is all the report's own lines use. */
function renderInline(text: string): string {
  return escapeHtml(text)
    .replaceAll(/`([^`]+)`/g, '<code>$1</code>')
    .replaceAll(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

function renderCount(label: string, before: number, after: number): string {
  const delta = after - before;
  const direction = delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down';
  return `<li class="${direction}">
      <b>${after}</b><span>${escapeHtml(label)}</span>
      <i>${delta === 0 ? 'unchanged' : `${delta > 0 ? '+' : ''}${delta} against the target`}</i>
    </li>`;
}

/**
 * The same report as a page.
 *
 * A comment is read once and scrolled past; this is the thing to open when the
 * question is what a branch did to the shape of the application rather than to
 * its lines.
 */
function renderDiffPage(
  application: string,
  base: ArchitectureModel,
  head: ArchitectureModel,
  sections: readonly ReportSection[],
): string {
  const unreachedBefore = base.routes.filter((route) => route.unreached).length;
  const unreachedAfter = head.routes.filter((route) => route.unreached).length;
  const body =
    sections.length === 0
      ? '<p class="none">No architectural change against the target branch.</p>'
      : sections
          .map(
            (entry) => `
      <section>
        <h2>${escapeHtml(entry.title)} <span class="count">${entry.lines.length}</span></h2>
        <ul>${entry.lines.map((line) => `<li>${renderInline(line)}</li>`).join('')}</ul>
      </section>`,
          )
          .join('');

  return `<title>${escapeHtml(application)} architecture diff</title>
<style>
  :root {
    color-scheme: light dark;
    --ground: #eef0f4; --panel: #ffffff; --ink: #15181d; --muted: #5b626e;
    --line: #d8dce4; --accent: #1f3a5f; --accent-soft: #dfe6f0;
    --signal: #b45309; --signal-soft: #fdf1e0; --good: #166534; --good-soft: #dcf3e4;
    --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) {
      --ground: #0f1216; --panel: #161b22; --ink: #e6e9ee; --muted: #98a1b0;
      --line: #262d36; --accent: #8fb2dd; --accent-soft: #1b2735;
      --signal: #e0a355; --signal-soft: #2c2317; --good: #8fdcab; --good-soft: #102a1b;
    }
  }
  :root[data-theme='dark'] {
    --ground: #0f1216; --panel: #161b22; --ink: #e6e9ee; --muted: #98a1b0;
    --line: #262d36; --accent: #8fb2dd; --accent-soft: #1b2735;
    --signal: #e0a355; --signal-soft: #2c2317; --good: #8fdcab; --good-soft: #102a1b;
  }
  body { margin: 0; background: var(--ground); color: var(--ink); font-family: var(--font-sans); }
  .wrap { max-width: 62rem; margin: 0 auto; padding: 1.5rem 1rem 4rem; }
  h1 { margin: 0 0 .3rem; font: 600 1.2rem/1.3 var(--font-mono); }
  .lede { margin: 0 0 1.2rem; color: var(--muted); font-size: .85rem; line-height: 1.6; max-width: 46rem; }
  .counts { list-style: none; margin: 0 0 1.6rem; padding: 0; display: grid; gap: .6rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr)); }
  .counts li { background: var(--panel); border: 1px solid var(--line); border-radius: 9px;
    padding: .7rem .8rem; min-width: 0; }
  .counts b { display: block; font: 600 1.4rem/1.2 var(--font-mono); }
  .counts span { display: block; font-size: .72rem; color: var(--muted); text-transform: uppercase;
    letter-spacing: .04em; margin-top: .15rem; }
  .counts i { display: block; font: .7rem/1.5 var(--font-mono); font-style: normal; margin-top: .3rem; color: var(--muted); }
  .counts .up i { color: var(--good); }
  .counts .down i { color: var(--signal); }
  section { background: var(--panel); border: 1px solid var(--line); border-radius: 9px;
    padding: .9rem 1rem; margin-bottom: .8rem; }
  section h2 { margin: 0 0 .5rem; font: 600 .85rem/1.4 var(--font-mono);
    display: flex; align-items: baseline; gap: .5rem; }
  .count { font: .7rem/1.5 var(--font-mono); color: var(--accent); background: var(--accent-soft);
    border-radius: 5px; padding: .05rem .4rem; }
  section ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .25rem; }
  section li { font: .76rem/1.6 var(--font-mono); color: var(--muted); min-width: 0;
    overflow-wrap: anywhere; }
  code { color: var(--ink); }
  b { color: var(--ink); }
  .none { color: var(--muted); font-size: .85rem; }
</style>
<div class="wrap">
  <h1>${escapeHtml(application)} — what this branch moved</h1>
  <p class="lede">Two generated models compared: the target branch and this one. Everything below is read from the code — routes from the call chain, layers from the paths, externals from the tags cross-checked against the manifest — so a line here means the shape of the application changed, not that a file did.</p>
  <ul class="counts">
    ${renderCount('source files', base.files.length, head.files.length)}
    ${renderCount('HTTP routes', base.routes.length, head.routes.length)}
    ${renderCount('routes with no caller', unreachedBefore, unreachedAfter)}
    ${renderCount('blueprints', base.blueprints.length, head.blueprints.length)}
    ${renderCount('external systems', base.externals.length, head.externals.length)}
  </ul>
  ${body}
</div>
`;
}

function main(): void {
  const positional = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
  const htmlIndex = process.argv.indexOf('--html');
  const htmlPath = htmlIndex === -1 ? null : (process.argv[htmlIndex + 1] ?? null);
  const [basePath, headPath] = positional;
  if (basePath === undefined || headPath === undefined) {
    console.error('Usage: architecture-diff.ts <base.json> <head.json> [--html <out.html>]');
    process.exit(2);
  }

  const base = readModel(basePath);
  const head = readModel(headPath);
  const applicationPrefix = `apps/${head.application}/`;

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

  const sections: ReportSection[] = [
    { title: 'Routes added', lines: routes.added.map((route) => describeRoute(route)) },
    { title: 'Routes removed', lines: routes.removed.map((route) => describeRoute(route)) },
    { title: 'Routes reaching something new', lines: reachChanges },
    { title: 'Routes with no caller left', lines: newlyUnreached },
    { title: 'Routes newly called', lines: nowReached },
    {
      title: 'External systems added',
      lines: externals.added.map((each) => `\`${each.id}\` (${each.name})`),
    },
    { title: 'External systems removed', lines: externals.removed.map((each) => `\`${each.id}\``) },
    { title: 'Files that changed layer', lines: layerMoves },
    {
      title: 'Files added',
      lines: files.added.map(
        (file) =>
          `\`${file.path.replace(applicationPrefix, '')}\` (${file.container}/${file.layer})`,
      ),
    },
    {
      title: 'Files removed',
      lines: files.removed.map((file) => `\`${file.path.replace(applicationPrefix, '')}\``),
    },
    { title: 'Blueprints added', lines: blueprints.added.map((each) => `\`${each.id}\``) },
    { title: 'Blueprints removed', lines: blueprints.removed.map((each) => `\`${each.id}\``) },
  ].filter((entry) => entry.lines.length > 0);

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
            `\`${file.path.replace(applicationPrefix, '')}\` (${file.container}/${file.layer})`,
        ),
      ),
    ),
    section(
      'Files removed',
      bullet(files.removed.map((file) => `\`${file.path.replace(applicationPrefix, '')}\``)),
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

  if (htmlPath !== null) {
    writeFileSync(htmlPath, renderDiffPage(head.application, base, head, sections));
    console.error(`Wrote ${htmlPath}`);
  }

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
