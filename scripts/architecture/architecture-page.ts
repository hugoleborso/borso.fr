/**
 * Renders the architecture graph as one self-contained page.
 *
 * Each diagram level ships its nodes and edges as JSON and is drawn in the
 * browser by the layered renderer in `architecture-graph-view.ts`, so the
 * arrows are real SVG paths with arrowheads that can be hovered, focused,
 * panned and zoomed. The levels carrying too many nodes for any layout to
 * help, meaning code and the slice walk, stay as filterable HTML, because a
 * reader browsing two hundred files wants search and detail rather than a
 * picture.
 */

import { GRAPH_RUNTIME_SCRIPT, GRAPH_STYLES } from './architecture-graph-view';
import type { JourneyModel } from './architecture-journeys';
import type { LevelLayout } from './architecture-layout';
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
  readonly layouts: ReadonlyMap<string, LevelLayout>;
  readonly journeys: JourneyModel;
  readonly journeyLayouts: ReadonlyMap<string, LevelLayout>;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * The tone drives the colour of a node's left stripe, and it is derived from
 * the node kind rather than authored, so a new container or boundary picks up a
 * colour without anyone editing a palette.
 */
function toneOf(kind: string): string {
  if (kind === 'actor' || kind === 'system') return kind;
  if (kind.startsWith('external-')) {
    if (kind.endsWith('aws')) return 'aws';
    if (kind.endsWith('browser-platform')) return 'browser';
    return 'external';
  }
  if (kind === 'container-browser') return 'site';
  if (kind === 'container-aws') return 'api';
  if (kind === 'container-build') return 'build';
  if (kind.startsWith('component-')) return kind.slice('component-'.length);
  return 'neutral';
}

/** JSON embedded in a script tag, with the one sequence that could close it escaped. */
function embedJson(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', String.raw`\u003c`);
}

function renderGraph(level: GraphLevel, layout: LevelLayout): string {
  const placed = new Map(layout.nodes.map((node) => [node.id, node]));
  const payload = {
    level: level.id,
    title: level.title,
    width: layout.width,
    height: layout.height,
    nodes: level.nodes.flatMap((node) => {
      const box = placed.get(node.id);
      if (box === undefined) return [];
      return [
        {
          id: node.id,
          label: node.label,
          sublabel:
            node.fileCount > 0 ? `${node.fileCount} file${node.fileCount === 1 ? '' : 's'}` : '',
          detail: node.detail,
          tone: toneOf(node.kind),
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        },
      ];
    }),
    edges: layout.edges,
  };
  return `
      <div class="graph" data-level="${escapeHtml(level.id)}">
        <div class="graph-bar">
          <span class="graph-hint">tap to trace · drag to pan · pinch or scroll to zoom</span>
          <span class="graph-legend">
            <span><i class="legend-line"></i>imports</span>
            <span><i class="legend-line type"></i>types only</span>
            <span><i class="legend-line http"></i>over HTTP</span>
          </span>
          <span class="graph-controls">
            <button type="button" data-graph-zoom-out aria-label="Zoom out">&minus;</button>
            <button type="button" data-graph-zoom-in aria-label="Zoom in">+</button>
            <button type="button" data-graph-reset>Fit</button>
          </span>
        </div>
        <div class="graph-stage"></div>
        <script type="application/json">${embedJson(payload)}</script>
      </div>`;
}

/**
 * The journey level: pick a feature, then an action, and see its flow.
 *
 * Every graph is laid out at generation time like the others, so switching
 * between them is a redraw of ready coordinates rather than a layout run.
 */
function renderUnreachedByAction(journeys: JourneyModel, slices: readonly ContextSlice[]): string {
  const behindAnAction = new Set(
    journeys.features.flatMap((feature) =>
      feature.actions.map((action) => `${action.method} ${action.path}`),
    ),
  );
  const orphans = slices
    .flatMap((slice) =>
      slice.routes.map((route) => ({
        id: `${route.method} ${route.path}`,
        context: slice.context,
      })),
    )
    .filter((route) => !behindAnAction.has(route.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (orphans.length === 0) return '';
  return `<ul class="orphan-routes">${orphans
    .map(
      (route) =>
        `<li><code>${escapeHtml(route.id)}</code><span class="loc">${escapeHtml(route.context)}</span></li>`,
    )
    .join('')}</ul>`;
}

function renderJourneys(
  journeys: JourneyModel,
  journeyLayouts: ReadonlyMap<string, LevelLayout>,
): string {
  const graphs: Record<string, unknown> = {};
  for (const [id, layout] of journeyLayouts) {
    graphs[id] = {
      width: layout.width,
      height: layout.height,
      nodes: layout.nodes.flatMap((placed) => {
        const source = journeys.graphs.get(id)?.nodes.find((node) => node.id === placed.id);
        if (source === undefined) return [];
        return [
          {
            id: placed.id,
            label: source.label,
            sublabel: '',
            detail: source.detail,
            tone: source.kind,
            x: placed.x,
            y: placed.y,
            width: placed.width,
            height: placed.height,
          },
        ];
      }),
      edges: layout.edges,
    };
  }

  const payload = {
    level: 'journey',
    title: 'User action',
    features: journeys.features.map((feature) => ({
      id: feature.id,
      label: feature.label,
      actions: feature.actions.map((action) => ({
        id: action.id,
        label: action.label,
        method: action.method,
        path: action.path,
      })),
    })),
    graphs,
  };

  return `
      <div class="graph journey" data-level="journey">
        <div class="journey-picker">
          <span class="journey-picker-label">Feature</span>
          <div class="journey-features">
            ${journeys.features
              .map(
                (feature) =>
                  `<button type="button" class="journey-feature" data-feature-id="${escapeHtml(feature.id)}" aria-pressed="false">${escapeHtml(feature.label)}</button>`,
              )
              .join('')}
          </div>
          <span class="journey-picker-label">Action</span>
          <div class="journey-actions" data-journey-actions></div>
        </div>
        <div class="graph-bar">
          <span class="graph-hint">tap to trace · drag to pan · pinch or scroll to zoom</span>
          <span class="graph-controls">
            <button type="button" data-graph-zoom-out aria-label="Zoom out">&minus;</button>
            <button type="button" data-graph-zoom-in aria-label="Zoom in">+</button>
            <button type="button" data-graph-reset>Fit</button>
          </span>
        </div>
        <div class="graph-stage"></div>
        <script type="application/json">${embedJson(payload)}</script>
      </div>`;
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
  const {
    manifest,
    levels,
    slices,
    blueprints,
    files,
    unmarkedCount,
    layouts,
    journeys,
    journeyLayouts,
  } = input;
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
      ${renderGraph(level, layouts.get(level.id) ?? { nodes: [], edges: [], width: 0, height: 0 })}
      <div class="cards">${renderNodeCards(level)}</div>`
      }
    </section>`,
    )
    .join('');

  return `<title>Pragma Architecture</title>
<style>
  /*
    Colour carries one meaning on this page: which layer a thing belongs to.
    The chrome is therefore achromatic and cool, so a controller blue or a
    repository amber is never competing with a decorative accent. Navy marks
    the active level and links; amber is reserved for a route nothing reaches.
    Monospace carries structure, because the subject is source files.
  */
  :root {
    color-scheme: light dark;
    --ground: #eef0f4;
    --panel: #ffffff;
    --panel-sunk: #f5f7fa;
    --ink: #15181d;
    --muted: #5b626e;
    --line: #d8dce4;
    --line-strong: #b9c1cd;
    --accent: #1f3a5f;
    --accent-soft: #dfe6f0;
    --signal: #b45309;
    --signal-soft: #fdf1e0;
    --layer-route: #1e40af; --layer-route-bg: #dde7fb;
    --layer-service: #166534; --layer-service-bg: #dcf3e4;
    --layer-data: #92400e; --layer-data-bg: #fbeed8;
    --layer-pure: #5b21b6; --layer-pure-bg: #e9e3fb;
    --layer-edge: #9f1239; --layer-edge-bg: #fbdfe5;
    --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) {
      --ground: #0f1216;
      --panel: #161b22;
      --panel-sunk: #1b212a;
      --ink: #e6e9ee;
      --muted: #98a1b0;
      --line: #262d36;
      --line-strong: #3a434f;
      --accent: #8fb2dd;
      --accent-soft: #1b2735;
      --signal: #e0a355;
      --signal-soft: #2c2317;
      --layer-route: #9dc0f5; --layer-route-bg: #17263f;
      --layer-service: #8fdcab; --layer-service-bg: #102a1b;
      --layer-data: #edc07a; --layer-data-bg: #2f2413;
      --layer-pure: #c3b1f5; --layer-pure-bg: #241d3a;
      --layer-edge: #f3a1b3; --layer-edge-bg: #341620;
    }
  }
  :root[data-theme='dark'] {
    --ground: #0f1216;
    --panel: #161b22;
    --panel-sunk: #1b212a;
    --ink: #e6e9ee;
    --muted: #98a1b0;
    --line: #262d36;
    --line-strong: #3a434f;
    --accent: #8fb2dd;
    --accent-soft: #1b2735;
    --signal: #e0a355;
    --signal-soft: #2c2317;
    --layer-route: #9dc0f5; --layer-route-bg: #17263f;
    --layer-service: #8fdcab; --layer-service-bg: #102a1b;
    --layer-data: #edc07a; --layer-data-bg: #2f2413;
    --layer-pure: #c3b1f5; --layer-pure-bg: #241d3a;
    --layer-edge: #f3a1b3; --layer-edge-bg: #341620;
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--ground);
    color: var(--ink);
    font: 15px/1.6 var(--font-sans);
    padding-bottom: 5rem;
  }
  .wrap { max-width: 76rem; margin: 0 auto; padding: 0 1.25rem; }

  header.top { border-bottom: 1px solid var(--line); padding: 2.5rem 0 1.5rem; }
  h1 {
    font: 600 clamp(1.3rem, 3.5vw, 1.8rem)/1.2 var(--font-mono);
    margin: 0 0 .5rem;
    letter-spacing: -.02em;
    text-wrap: balance;
  }
  .lede { color: var(--muted); max-width: 62ch; margin: 0 0 1.5rem; }
  .stats { display: flex; flex-wrap: wrap; gap: 1rem 2.25rem; padding: 0; margin: 0; list-style: none; }
  .stats li {
    font: .7rem/1.4 var(--font-mono);
    text-transform: uppercase;
    letter-spacing: .07em;
    color: var(--muted);
  }
  .stats b {
    display: block;
    font: 600 1.5rem/1.1 var(--font-mono);
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    letter-spacing: -.02em;
  }
  .stats li.flagged b { color: var(--signal); }

  nav.levels {
    position: sticky; top: 0; z-index: 5;
    background: var(--ground);
    border-bottom: 1px solid var(--line);
    margin-bottom: 2rem;
  }
  nav.levels .wrap { display: flex; gap: .15rem; overflow-x: auto; padding-top: .55rem; padding-bottom: .55rem; }
  nav.levels button {
    flex: 0 0 auto;
    font: 500 .78rem/1 var(--font-mono);
    letter-spacing: .01em;
    color: var(--muted);
    background: none;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: .5rem .75rem;
    cursor: pointer;
    white-space: nowrap;
  }
  nav.levels button:hover { color: var(--ink); background: var(--panel-sunk); }
  nav.levels button[aria-selected='true'] {
    background: var(--accent-soft);
    color: var(--accent);
    border-color: var(--line-strong);
  }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

  h2 { font: 600 1.15rem/1.3 var(--font-mono); margin: 0 0 .5rem; letter-spacing: -.01em; }
  h3 { font: 600 .95rem/1.3 var(--font-mono); margin: 0 0 .4rem; }
  .summary { color: var(--muted); max-width: 74ch; margin: 0 0 1.5rem; font-size: .89rem; }

  .diagram-scroll, .table-scroll {
    overflow-x: auto;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 1rem;
    margin-bottom: 1.75rem;
  }

  .cards { display: grid; grid-template-columns: 1fr; gap: .7rem; }
  @media (min-width: 620px) { .cards { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1000px) { .cards { grid-template-columns: repeat(3, 1fr); } }
  .card {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: .85rem .95rem;
    display: flex;
    flex-direction: column;
    gap: .4rem;
    /* A grid item defaults to min-width:auto, so the nowrap kind tag in the
       header sets a floor wider than the track's share and pushes the whole
       page sideways. */
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .card header { display: flex; align-items: baseline; justify-content: space-between; gap: .5rem; flex-wrap: wrap; }
  .card h4 { margin: 0; font: 600 .88rem/1.3 var(--font-mono); }
  .card p { margin: 0; font-size: .81rem; color: var(--muted); }
  .tag {
    font: .64rem/1.4 var(--font-mono);
    color: var(--muted);
    background: var(--panel-sunk);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: .1rem .45rem;
    white-space: nowrap;
  }
  .bp { display: flex; gap: .35rem; flex-wrap: wrap; }
  .bp span {
    font: .64rem/1.4 var(--font-mono);
    padding: .1rem .45rem;
    border-radius: 4px;
    background: var(--accent-soft);
    color: var(--accent);
  }

  table { border-collapse: collapse; width: 100%; font-size: .81rem; }
  th, td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid var(--line); vertical-align: top; }
  th {
    font: 600 .66rem/1.4 var(--font-mono);
    text-transform: uppercase;
    letter-spacing: .07em;
    color: var(--muted);
    position: sticky;
    top: 0;
    background: var(--panel);
  }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tbody tr:hover { background: var(--panel-sunk); }
  code, .loc { font-family: var(--font-mono); font-size: .76rem; }
  .loc { color: var(--muted); }

  .filters { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: .9rem; }
  .filters input, .filters select {
    font: .83rem/1.4 var(--font-sans);
    padding: .42rem .6rem;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: var(--panel);
    color: var(--ink);
  }
  .filters input { flex: 1 1 18rem; }

  .layer {
    display: inline-block;
    font: 500 .64rem/1.5 var(--font-mono);
    padding: .08rem .4rem;
    border-radius: 4px;
    background: var(--panel-sunk);
    color: var(--muted);
    margin: 0 .2rem .2rem 0;
    white-space: nowrap;
  }
  .layer-controller, .layer-route, .layer-entrypoint { background: var(--layer-route-bg); color: var(--layer-route); }
  .layer-service, .layer-query, .layer-hook { background: var(--layer-service-bg); color: var(--layer-service); }
  .layer-repository, .layer-database, .layer-schema, .layer-store { background: var(--layer-data-bg); color: var(--layer-data); }
  .layer-core, .layer-utils, .layer-types { background: var(--layer-pure-bg); color: var(--layer-pure); }
  .layer-adapter, .layer-client, .layer-middleware { background: var(--layer-edge-bg); color: var(--layer-edge); }

  .slice {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: .95rem 1.1rem;
    margin-bottom: .8rem;
  }
  .slice h3 { display: flex; align-items: center; gap: .55rem; flex-wrap: wrap; }
  .mount {
    background: var(--panel-sunk);
    border: 1px solid var(--line);
    padding: .08rem .4rem;
    border-radius: 4px;
    color: var(--muted);
    font-weight: 400;
  }
  .slice-files { margin: 0 0 .6rem; }

  details.route { border-top: 1px solid var(--line); padding: .45rem 0 .2rem; }
  details.route summary {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: .5rem;
    flex-wrap: wrap;
    list-style: none;
  }
  details.route summary::-webkit-details-marker { display: none; }
  details.route[open] summary { margin-bottom: .3rem; }
  .method {
    font: 700 .66rem/1.5 var(--font-mono);
    padding: .1rem .4rem;
    border-radius: 4px;
    background: var(--panel-sunk);
    min-width: 3.6rem;
    text-align: center;
  }
  .method-get { color: var(--layer-route); background: var(--layer-route-bg); }
  .method-post { color: var(--layer-service); background: var(--layer-service-bg); }
  .method-put { color: var(--layer-data); background: var(--layer-data-bg); }
  .method-delete { color: var(--layer-edge); background: var(--layer-edge-bg); }
  .path { font-weight: 600; }
  .route-meta { font: .72rem/1.4 var(--font-mono); color: var(--muted); margin-left: auto; }
  details.route:has(.unreached) { border-left: 2px solid var(--signal); padding-left: .6rem; }
  details.route:has(.unreached) .route-meta { color: var(--signal); }
  .route-body { padding: .3rem 0 .5rem; }

  ol.chain { list-style: none; margin: 0 0 .5rem; padding: 0; display: flex; flex-direction: column; gap: .1rem; }
  ol.chain li {
    display: flex;
    align-items: baseline;
    gap: .5rem;
    padding: .18rem 0 .18rem .85rem;
    border-left: 2px solid var(--line-strong);
    flex-wrap: wrap;
  }
  ol.chain code { font-weight: 600; }
  .reaches { margin: .25rem 0; font-size: .79rem; color: var(--muted); }
  .reaches strong {
    color: var(--ink);
    font: 600 .66rem/1.5 var(--font-mono);
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-right: .4rem;
  }
  .unreached { color: var(--signal); background: var(--signal-soft); border-radius: 5px; padding: .3rem .5rem; }
  .unreached strong { color: var(--signal); }
  .empty { color: var(--muted); font-size: .82rem; margin: .4rem 0 0; }

  .bp-chip {
    display: inline-block;
    font: .64rem/1.5 var(--font-mono);
    padding: .06rem .35rem;
    border-radius: 4px;
    background: var(--panel-sunk);
    border: 1px solid var(--line);
    color: var(--muted);
    margin: 0 .2rem .2rem 0;
  }
  .bp-chip.declares { background: var(--accent-soft); border-color: var(--line-strong); color: var(--accent); font-weight: 600; }
  .note {
    font-size: .82rem;
    color: var(--muted);
    border-left: 2px solid var(--line-strong);
    padding: .35rem 0 .35rem .85rem;
    margin: 1.25rem 0;
    max-width: 70ch;
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
  }
${GRAPH_STYLES}
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
    <li class="flagged"><b>${unmarkedCount}</b>files with no pattern marker</li>
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
  <button role="tab" data-target="level-slice" aria-selected="false">Level 3.5 — User actions</button>
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
    <h2>Level 3.5 — User actions</h2>
    <p class="summary">One thing a band member does, drawn end to end: the components that trigger it, the endpoint it reaches, and every function behind that endpoint down to the tables and external systems. An action is an exported hook in a query module, so the names are the ones whoever wrote them chose, and the chain comes from the calls as written.</p>
    ${renderJourneys(journeys, journeyLayouts)}
    <p class="note">Endpoints below sit behind no user action. Some are deliberate — the admin bootstrap has no screen, and the test seed is never shipped to one — and the rest are the back end of a feature whose front end does not exist yet. The generator reports the fact and does not guess which.</p>
    ${renderUnreachedByAction(journeys, slices)}
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
<script>${GRAPH_RUNTIME_SCRIPT}</script>
`;
}
