/**
 * Renders the architecture graph as one self-contained page.
 *
 * Diagrams are emitted as mermaid source in `<pre class="mermaid">` blocks,
 * which the artifact viewer renders natively and which stays readable as text
 * anywhere else. The levels that carry too many nodes for an automatic layout
 * to help, meaning code and the slice walk, are rendered as filterable HTML
 * instead, because a reader browsing those wants search and detail rather than
 * a picture.
 */

import type { ArchitectureFile } from './architecture-model';
import type { BlueprintEntry, ContextSlice, GraphLevel } from './architecture-graph';
import type { ArchitectureManifest } from './pragma.manifest';

export interface RenderInput {
  readonly manifest: ArchitectureManifest;
  readonly levels: readonly GraphLevel[];
  readonly slices: readonly ContextSlice[];
  readonly blueprints: readonly BlueprintEntry[];
  readonly files: readonly ArchitectureFile[];
  readonly unmarkedCount: number;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Mermaid treats quotes, brackets and pipes as syntax, so a label loses them. */
function mermaidLabel(text: string): string {
  return text
    .replaceAll(/["[\]{}|<>()]/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function mermaidId(id: string): string {
  return `n${id.replaceAll(/[^A-Za-z0-9]/g, '_')}`;
}

function renderMermaid(level: GraphLevel, groupTitles: ReadonlyMap<string, string>): string {
  const lines: string[] = ['flowchart LR'];
  const byGroup = new Map<string, typeof level.nodes>();
  for (const node of level.nodes) {
    const key = node.group ?? '_';
    byGroup.set(key, [...(byGroup.get(key) ?? []), node]);
  }
  for (const [group, nodes] of byGroup) {
    const hasTitle = group !== '_';
    if (hasTitle) {
      lines.push(
        `  subgraph ${mermaidId(group)}["${mermaidLabel(groupTitles.get(group) ?? group)}"]`,
      );
    }
    for (const node of nodes) {
      const shape = node.kind === 'actor' ? ['([', '])'] : ['["', '"]'];
      const label = mermaidLabel(node.label);
      lines.push(`  ${hasTitle ? '  ' : ''}${mermaidId(node.id)}${shape[0]}${label}${shape[1]}`);
    }
    if (hasTitle) lines.push('  end');
  }
  const nodeIds = new Set(level.nodes.map((node) => node.id));
  const drawn = new Set<string>();
  for (const edge of level.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
    const key = `${edge.from}->${edge.to}`;
    if (drawn.has(key)) continue;
    drawn.add(key);
    const arrow = edge.kind === 'type' ? '-.->' : '-->';
    const label = mermaidLabel(edge.label);
    lines.push(
      `  ${mermaidId(edge.from)} ${arrow}${label === '' ? '' : `|${label}|`} ${mermaidId(edge.to)}`,
    );
  }
  return lines.join('\n');
}

function renderNodeCards(level: GraphLevel): string {
  return level.nodes
    .map(
      (node) => `
      <article class="card" data-group="${escapeHtml(node.group ?? '')}">
        <header>
          <h4>${escapeHtml(node.label)}</h4>
          <span class="tag tag-${escapeHtml(node.kind.split('-')[0] ?? 'x')}">${escapeHtml(node.kind)}</span>
        </header>
        <p>${escapeHtml(node.detail)}</p>
        ${
          node.blueprints.length > 0 || node.followsBlueprints.length > 0
            ? `<p class="bp">${
                node.blueprints.length > 0
                  ? `<span class="bp-declares">${node.blueprints.length} blueprint${node.blueprints.length === 1 ? '' : 's'}</span>`
                  : ''
              }${
                node.followsBlueprints.length > 0
                  ? `<span class="bp-follows">${node.followsBlueprints.length} follower${node.followsBlueprints.length === 1 ? '' : 's'}</span>`
                  : ''
              }</p>`
            : ''
        }
      </article>`,
    )
    .join('');
}

function renderSlices(slices: readonly ContextSlice[]): string {
  return slices
    .map((slice) => {
      const routes = slice.routes
        .map(
          (route) => `
        <details class="route">
          <summary>
            <code class="method method-${escapeHtml(route.method.toLowerCase())}">${escapeHtml(route.method)}</code>
            <code class="path">${escapeHtml(route.path)}</code>
            <span class="route-meta">${route.steps.length} step${route.steps.length === 1 ? '' : 's'}${
              route.tables.length > 0
                ? ` · ${route.tables.length} table${route.tables.length === 1 ? '' : 's'}`
                : ''
            }${route.externals.length > 0 ? ' · external' : ''}${
              route.callers.length + route.urlCallers.length > 0
                ? ` · ${route.callers.length + route.urlCallers.length} caller${
                    route.callers.length + route.urlCallers.length === 1 ? '' : 's'
                  }`
                : ' · no caller'
            }</span>
          </summary>
          <div class="route-body">
            <ol class="chain">
              ${route.steps
                .map(
                  (step) =>
                    `<li><span class="layer layer-${escapeHtml(step.layer)}">${escapeHtml(step.layer)}</span><code>${escapeHtml(step.label)}</code><span class="loc">${escapeHtml(step.file)}:${step.line}</span></li>`,
                )
                .join('')}
            </ol>
            ${
              route.tables.length > 0
                ? `<p class="reaches"><strong>Tables</strong> ${route.tables.map((table) => `<code>${escapeHtml(table)}</code>`).join(' ')}</p>`
                : ''
            }
            ${
              route.externals.length > 0
                ? `<p class="reaches"><strong>External</strong> ${route.externals.map((external) => `<code>${escapeHtml(external)}</code>`).join(' ')}</p>`
                : ''
            }
            ${
              route.callers.length > 0
                ? `<p class="reaches"><strong>Called from</strong> ${route.callers.map((caller) => `<code>${escapeHtml(caller)}</code>`).join(' ')}</p>`
                : ''
            }
            ${
              route.urlCallers.length > 0
                ? `<p class="reaches"><strong>Fetched by URL from</strong> ${route.urlCallers.map((caller) => `<code>${escapeHtml(caller)}</code>`).join(' ')}</p>`
                : ''
            }
            ${
              route.callers.length === 0 && route.urlCallers.length === 0
                ? '<p class="reaches unreached"><strong>Called from</strong> nothing in this application reaches this route, through either the typed client or a URL string</p>'
                : ''
            }
          </div>
        </details>`,
        )
        .join('');
      return `
      <section class="slice" data-slice="${escapeHtml(slice.context)}">
        <h3>${escapeHtml(slice.context)} ${slice.mountPath === null ? '' : `<code class="mount">${escapeHtml(slice.mountPath)}</code>`}</h3>
        <p class="slice-files">${slice.files
          .map(
            (file) =>
              `<span class="layer layer-${escapeHtml(file.layer)}">${escapeHtml(file.layer)}</span>`,
          )
          .join('')}</p>
        ${routes === '' ? '<p class="empty">No HTTP routes in this context.</p>' : routes}
      </section>`;
    })
    .join('');
}

function renderBlueprints(blueprints: readonly BlueprintEntry[]): string {
  return blueprints
    .map(
      (blueprint) => `
      <tr>
        <td><code>${escapeHtml(blueprint.id)}</code></td>
        <td class="loc">${escapeHtml(blueprint.file === '' ? 'not declared' : blueprint.file)}</td>
        <td class="num">${blueprint.followers.length}</td>
      </tr>`,
    )
    .join('');
}

export function renderArchitecturePage(input: RenderInput): string {
  const { manifest, levels, slices, blueprints, files, unmarkedCount } = input;
  const groupTitles = new Map<string, string>([
    ...manifest.containers.map((each) => [each.id, each.name] as const),
    ['people', 'People'],
    ['system', 'System'],
    ['third-party', 'Third party'],
    ['aws', 'AWS'],
    ['browser-platform', 'Browser platform'],
    ['browser', 'Browser'],
    ['build', 'Build time'],
    ...manifest.containers.map((each) => [each.id, each.name] as const),
  ]);

  const fileRows = files
    .map(
      (
        file,
      ) => `<tr data-container="${escapeHtml(file.container)}" data-layer="${escapeHtml(file.layer)}" data-context="${escapeHtml(file.feature ?? file.context)}">
        <td class="loc">${escapeHtml(file.path.replace('apps/pragma/', ''))}</td>
        <td><span class="layer layer-${escapeHtml(file.layer)}">${escapeHtml(file.layer)}</span></td>
        <td>${escapeHtml(file.feature ?? file.context)}</td>
        <td class="num">${file.lineCount}</td>
        <td class="num">${file.exports.length}</td>
        <td class="num">${file.imports.filter((edge) => edge.targetFile !== null).length}</td>
        <td>${file.blueprints.map((id) => `<code class="bp-chip declares">${escapeHtml(id)}</code>`).join('')}${file.followsBlueprints.map((id) => `<code class="bp-chip">${escapeHtml(id)}</code>`).join('')}</td>
      </tr>`,
    )
    .join('');

  const layers = [...new Set(files.map((file) => file.layer))].sort();
  const routeTotal = slices.reduce((total, slice) => total + slice.routes.length, 0);

  const levelSections = levels
    .map(
      (level, index) => `
    <section class="level" id="level-${escapeHtml(level.id)}" ${index === 0 ? '' : 'hidden'}>
      <h2>${escapeHtml(level.title)}</h2>
      <p class="summary">${escapeHtml(level.summary)}</p>
      ${
        level.id === 'code'
          ? `
      <div class="filters">
        <input type="search" id="file-search" placeholder="Filter files by path, layer or context" />
        <select id="layer-filter"><option value="">Every layer</option>${layers
          .map((layer) => `<option value="${escapeHtml(layer)}">${escapeHtml(layer)}</option>`)
          .join('')}</select>
      </div>
      <div class="table-scroll">
        <table id="file-table">
          <thead><tr><th>File</th><th>Layer</th><th>Context</th><th class="num">Lines</th><th class="num">Exports</th><th class="num">Imports</th><th>Blueprint</th></tr></thead>
          <tbody>${fileRows}</tbody>
        </table>
      </div>`
          : `
      <div class="diagram-scroll"><pre class="mermaid">${escapeHtml(renderMermaid(level, groupTitles))}</pre></div>
      <div class="cards">${renderNodeCards(level)}</div>`
      }
    </section>`,
    )
    .join('');

  return `<title>Pragma Architecture</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #fbfaf8; --panel: #ffffff; --ink: #1a1a1a; --muted: #5f5f5f;
    --line: #e2ded7; --accent: #7a4b2a; --accent-soft: #f0e6dd;
    --chip: #efece7; --ok: #2f6b4f; --warn: #8a5a1f;
    --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #16151a; --panel: #1e1d24; --ink: #ece9e4; --muted: #a09b94;
      --line: #33313b; --accent: #d9a273; --accent-soft: #2b2620;
      --chip: #2a2830; --ok: #7fc0a0; --warn: #d9a273;
    }
  }
  :root[data-theme="dark"] {
    --bg: #16151a; --panel: #1e1d24; --ink: #ece9e4; --muted: #a09b94;
    --line: #33313b; --accent: #d9a273; --accent-soft: #2b2620;
    --chip: #2a2830; --ok: #7fc0a0; --warn: #d9a273;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    padding: 0 0 6rem;
  }
  .wrap { max-width: 78rem; margin: 0 auto; padding: 0 1.25rem; }
  header.top { border-bottom: 1px solid var(--line); padding: 2.5rem 0 1.5rem; margin-bottom: 1.5rem; }
  h1 { font-size: clamp(1.6rem, 4vw, 2.3rem); margin: 0 0 .4rem; letter-spacing: -.02em; }
  .lede { color: var(--muted); max-width: 60ch; margin: 0 0 1.25rem; }
  .stats { display: flex; flex-wrap: wrap; gap: .5rem 1.75rem; padding: 0; margin: 0; list-style: none; }
  .stats li { font-size: .82rem; color: var(--muted); }
  .stats b { display: block; font-size: 1.35rem; color: var(--ink); font-variant-numeric: tabular-nums; }
  nav.levels { position: sticky; top: 0; z-index: 5; background: var(--bg);
    border-bottom: 1px solid var(--line); margin-bottom: 1.75rem; }
  nav.levels .wrap { display: flex; gap: .25rem; overflow-x: auto; padding-top: .5rem; padding-bottom: .5rem; }
  nav.levels button {
    flex: 0 0 auto; font: inherit; font-size: .88rem; color: var(--muted); background: none;
    border: 1px solid transparent; border-radius: 7px; padding: .4rem .8rem; cursor: pointer; white-space: nowrap;
  }
  nav.levels button[aria-selected="true"] { background: var(--accent-soft); color: var(--accent); border-color: var(--line); font-weight: 600; }
  h2 { font-size: 1.3rem; margin: 0 0 .35rem; letter-spacing: -.01em; }
  h3 { font-size: 1.05rem; margin: 2rem 0 .5rem; }
  .summary { color: var(--muted); max-width: 72ch; margin: 0 0 1.5rem; font-size: .92rem; }
  .diagram-scroll, .table-scroll { overflow-x: auto; background: var(--panel);
    border: 1px solid var(--line); border-radius: 12px; padding: 1rem; margin-bottom: 1.75rem; }
  pre.mermaid { margin: 0; font-family: var(--mono); font-size: .78rem; color: var(--muted); white-space: pre; }
  .cards { display: grid; grid-template-columns: 1fr; gap: .75rem; }
  @media (min-width: 640px) { .cards { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .cards { grid-template-columns: repeat(3, 1fr); } }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: .85rem 1rem; }
  .card header { display: flex; align-items: baseline; justify-content: space-between; gap: .5rem; }
  .card h4 { margin: 0 0 .3rem; font-size: .95rem; }
  .card p { margin: 0; font-size: .84rem; color: var(--muted); }
  .tag { font-size: .68rem; font-family: var(--mono); color: var(--muted); background: var(--chip);
    border-radius: 999px; padding: .12rem .5rem; white-space: nowrap; }
  .bp { margin-top: .55rem !important; display: flex; gap: .4rem; flex-wrap: wrap; }
  .bp span { font-size: .68rem; padding: .12rem .45rem; border-radius: 999px; background: var(--accent-soft); color: var(--accent); }
  table { border-collapse: collapse; width: 100%; font-size: .84rem; }
  th, td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); font-weight: 600; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .loc, code { font-family: var(--mono); font-size: .78rem; }
  .loc { color: var(--muted); }
  .filters { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: .9rem; }
  .filters input, .filters select { font: inherit; font-size: .85rem; padding: .4rem .6rem;
    border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); }
  .filters input { flex: 1 1 18rem; }
  .layer { display: inline-block; font-family: var(--mono); font-size: .68rem; padding: .1rem .42rem;
    border-radius: 5px; background: var(--chip); color: var(--muted); margin-right: .25rem; }
  .layer-controller, .layer-route { background: #dbeafe; color: #1e40af; }
  .layer-service { background: #dcfce7; color: #166534; }
  .layer-repository, .layer-database { background: #fef3c7; color: #92400e; }
  .layer-core, .layer-utils { background: #ede9fe; color: #5b21b6; }
  .layer-adapter, .layer-client { background: #fee2e2; color: #991b1b; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) .layer-controller, :root:not([data-theme="light"]) .layer-route { background: #1e3a5f; color: #93c5fd; }
    :root:not([data-theme="light"]) .layer-service { background: #14532d; color: #86efac; }
    :root:not([data-theme="light"]) .layer-repository, :root:not([data-theme="light"]) .layer-database { background: #4a3410; color: #fcd34d; }
    :root:not([data-theme="light"]) .layer-core, :root:not([data-theme="light"]) .layer-utils { background: #3b2a5e; color: #c4b5fd; }
    :root:not([data-theme="light"]) .layer-adapter, :root:not([data-theme="light"]) .layer-client { background: #4c1d1d; color: #fca5a5; }
  }
  .slice { background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
    padding: 1rem 1.15rem; margin-bottom: 1rem; }
  .slice h3 { margin: 0 0 .35rem; font-size: 1rem; display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
  .mount { background: var(--chip); padding: .1rem .45rem; border-radius: 5px; color: var(--muted); }
  .slice-files { margin: 0 0 .75rem; }
  details.route { border-top: 1px solid var(--line); padding: .5rem 0 .25rem; }
  details.route summary { cursor: pointer; display: flex; align-items: center; gap: .55rem; flex-wrap: wrap; list-style: none; }
  details.route summary::-webkit-details-marker { display: none; }
  .method { font-size: .7rem; font-weight: 700; padding: .12rem .45rem; border-radius: 5px; background: var(--chip); }
  .method-get { color: #1e40af; } .method-post { color: #166534; }
  .method-put { color: #92400e; } .method-delete { color: #991b1b; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) .method-get { color: #93c5fd; }
    :root:not([data-theme="light"]) .method-post { color: #86efac; }
    :root:not([data-theme="light"]) .method-put { color: #fcd34d; }
    :root:not([data-theme="light"]) .method-delete { color: #fca5a5; }
  }
  .path { font-weight: 600; }
  .route-meta { font-size: .74rem; color: var(--muted); margin-left: auto; }
  .route-body { padding: .6rem 0 .5rem .25rem; }
  ol.chain { list-style: none; margin: 0 0 .6rem; padding: 0; }
  ol.chain li { display: flex; align-items: baseline; gap: .5rem; padding: .18rem 0 .18rem .9rem;
    border-left: 2px solid var(--line); flex-wrap: wrap; }
  ol.chain code { font-weight: 600; }
  .reaches { margin: .3rem 0; font-size: .8rem; color: var(--muted); }
  .reaches strong { color: var(--ink); font-weight: 600; margin-right: .35rem; }
  .unreached strong { color: var(--warn); }
  .empty { color: var(--muted); font-size: .85rem; margin: .4rem 0 0; }
  .bp-chip { display: inline-block; font-size: .68rem; padding: .08rem .4rem; border-radius: 5px;
    background: var(--chip); color: var(--muted); margin: 0 .2rem .2rem 0; }
  .bp-chip.declares { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
  .note { font-size: .84rem; color: var(--muted); border-left: 3px solid var(--line);
    padding: .3rem 0 .3rem .85rem; margin: 1.25rem 0; max-width: 68ch; }
</style>

<header class="top"><div class="wrap">
  <h1>Pragma architecture</h1>
  <p class="lede">${escapeHtml(manifest.description)}</p>
  <ul class="stats">
    <li><b>${files.length}</b>source files</li>
    <li><b>${manifest.containers.length}</b>containers</li>
    <li><b>${slices.length}</b>bounded contexts</li>
    <li><b>${routeTotal}</b>HTTP routes</li>
    <li><b>${blueprints.length}</b>blueprints</li>
    <li><b>${unmarkedCount}</b>files with no pattern marker</li>
  </ul>
</div></header>

<nav class="levels"><div class="wrap" role="tablist">
  ${levels
    .slice(0, 3)
    .map(
      (level, index) =>
        `<button role="tab" data-target="level-${escapeHtml(level.id)}" aria-selected="${index === 0}">${escapeHtml(level.title)}</button>`,
    )
    .join('')}
  <button role="tab" data-target="level-slice" aria-selected="false">Level 3.5 — Slices</button>
  ${levels
    .slice(3)
    .map(
      (level) =>
        `<button role="tab" data-target="level-${escapeHtml(level.id)}" aria-selected="false">${escapeHtml(level.title)}</button>`,
    )
    .join('')}
  <button role="tab" data-target="level-patterns" aria-selected="false">Patterns</button>
</div></nav>

<main class="wrap">
  ${levelSections}

  <section class="level" id="level-slice" hidden>
    <h2>Level 3.5 — Slices</h2>
    <p class="summary">One bounded context walked end to end. Each route expands into the chain of functions it actually calls, taken from the identifiers each handler references, down to the tables and external systems it reaches, and back up to the front-end modules that call the endpoint. This is the level at which you can decide whether a slice does what its name claims without opening a file.</p>
    <p class="note">Callers are counted two ways: through the typed Hono client, where the call is read off the property chain, and by URL string, which is how the service worker reaches the API. A route with neither is either deliberately back-end-only, such as the admin bootstrap and the test seed, or dead. The generator reports the fact and does not guess which.</p>
    ${renderSlices(slices)}
  </section>

  <section class="level" id="level-patterns" hidden>
    <h2>Patterns</h2>
    <p class="summary">The blueprint overlay. A blueprint is a canonical example marked in place; followers carry its id. Coverage is partial by design, so this view sits beside the position graph rather than inside it: position says where a node is, a pattern says which example it copies.</p>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Blueprint</th><th>Declared in</th><th class="num">Followers</th></tr></thead>
        <tbody>${renderBlueprints(blueprints)}</tbody>
      </table>
    </div>
  </section>
</main>

<script>
  const tabs = [...document.querySelectorAll('nav.levels button')];
  const panels = [...document.querySelectorAll('section.level')];
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    tabs.forEach((each) => each.setAttribute('aria-selected', String(each === tab)));
    const target = tab.dataset.target;
    panels.forEach((panel) => { panel.hidden = panel.id !== target; });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));

  const search = document.getElementById('file-search');
  const layerFilter = document.getElementById('layer-filter');
  const rows = [...document.querySelectorAll('#file-table tbody tr')];
  function applyFilters() {
    const term = (search?.value ?? '').toLowerCase();
    const layer = layerFilter?.value ?? '';
    rows.forEach((row) => {
      const matchesTerm = term === '' || row.textContent.toLowerCase().includes(term);
      const matchesLayer = layer === '' || row.dataset.layer === layer;
      row.hidden = !(matchesTerm && matchesLayer);
    });
  }
  search?.addEventListener('input', applyFilters);
  layerFilter?.addEventListener('change', applyFilters);
</script>
`;
}
