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
import type { JourneyModel, SourceEntry } from './architecture-journeys';
import type { LevelLayout } from './architecture-layout';
import type { ArchitectureFile } from './architecture-model';
import type {
  BlueprintEntry,
  ContextSlice,
  FileHistory,
  GraphLevel,
  LevelCoverage,
  StandardEntry,
  StatusByNode,
} from './architecture-graph';
import type { ArchitectureManifest } from './architecture-manifest';

/**
 * What a branch did, counted, before a reviewer reads a single block.
 *
 * The graphs answer *where* something moved; this answers *how much*, and it is
 * the part that tells a reviewer whether the page is worth their next minute.
 */
export interface DiffReport {
  /** The revision this branch is compared against, short. */
  readonly baseline: string;
  readonly counts: readonly { label: string; value: number }[];
  /** Things the colours deliberately do not say, in the reader's words. */
  readonly notes: readonly string[];
  /** New path → the path it came from, for every file this branch renamed. */
  readonly renamedFrom: Readonly<Record<string, string>>;
  readonly removedFiles: readonly { path: string; layer: string; context: string }[];
  /** Movement on the header totals, keyed by the label they carry. */
  readonly deltas: Readonly<Record<string, number>>;
}

export interface RenderInput {
  readonly manifest: ArchitectureManifest;
  readonly levels: readonly GraphLevel[];
  readonly slices: readonly ContextSlice[];
  readonly blueprints: readonly BlueprintEntry[];
  readonly files: readonly ArchitectureFile[];
  /** How much of the codebase each level draws, one entry per level id. */
  readonly coverage: readonly LevelCoverage[];
  /** Everything the code dialog can open, keyed once for the whole page. */
  readonly sources: Readonly<Record<string, SourceEntry>>;
  readonly standards: readonly StandardEntry[];
  /** Last commit per blueprint or standard file, keyed by repo-relative path. */
  readonly histories: Readonly<Record<string, FileHistory>>;
  readonly repositorySlug: string;
  /** Present only on the diff page: what this branch did to each block. */
  readonly statuses?: ReadonlyMap<string, StatusByNode>;
  /** Present only on the diff page, alongside `statuses`. */
  readonly report?: DiffReport;
  readonly unmarkedCount: number;
  readonly layouts: ReadonlyMap<string, LevelLayout>;
  readonly journeys: JourneyModel;
  readonly journeyLayouts: ReadonlyMap<string, LevelLayout>;
}

/**
 * The one line that says whether this page is worth the next minute: how many
 * files moved, in which direction, against which revision.
 */
function renderDiffCounts(report: DiffReport | undefined): string {
  if (report === undefined) return '';
  const counted = report.counts
    .filter((each) => each.value > 0)
    .map(
      (each) =>
        `<li class="count-${escapeHtml(each.label)}"><b>${each.value}</b>${escapeHtml(each.label)}</li>`,
    )
    .join('');
  return `<ul class="diff-counts">${counted === '' ? '<li>no file added, renamed, edited or removed</li>' : counted}<li class="baseline">against <code>${escapeHtml(report.baseline)}</code></li></ul>
  ${report.notes.map((note) => `<p class="diff-note">${escapeHtml(note)}</p>`).join('')}`;
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

function renderGraph(
  level: GraphLevel,
  layout: LevelLayout,
  statuses: StatusByNode | undefined,
): string {
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
          icon: node.icon ?? '',
          lines: node.lines ?? [],
          chips: node.chips ?? [],
          detail: node.detail,
          tone: toneOf(node.kind),
          status: statuses?.get(node.id) ?? '',
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

/**
 * A journey step is coloured by what the branch did to the file it lives in.
 *
 * Silence on this level reads as "unchanged", which is the worst default for
 * the walk that ties a URL to a table; a step whose module this branch wrote is
 * exactly the step a reviewer should look at first.
 */
function journeyStatusOf(location: string | undefined, code: StatusByNode | undefined): string {
  if (location === undefined || code === undefined) return '';
  return code.get(location.slice(0, location.lastIndexOf(':'))) ?? '';
}

function renderJourneys(
  journeys: JourneyModel,
  journeyLayouts: ReadonlyMap<string, LevelLayout>,
  code: StatusByNode | undefined,
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
            icon: source.icon ?? '',
            lines: source.lines ?? [],
            chips: source.chips ?? [],
            detail: source.detail,
            tone: source.kind,
            status: journeyStatusOf(source.location, code),
            sourceKey: source.sourceKey ?? '',
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
    sources: Object.fromEntries(journeys.sources),
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

/**
 * What a level draws, and what it leaves out.
 *
 * A diagram that shows most of a codebase and says nothing about the rest is
 * read as showing all of it. The bar per layer says how much, and the list says
 * exactly which files are missing — collapsed, because on a level that draws
 * everything there is nothing to open, and on one that does not the list is
 * long.
 */
function renderCoverage(coverage: LevelCoverage | undefined, applicationPrefix: string): string {
  if (coverage === undefined) return '';
  const total = coverage.byLayer.reduce((sum, layer) => sum + layer.total, 0);
  const covered = coverage.byLayer.reduce((sum, layer) => sum + layer.covered, 0);
  const percent = total === 0 ? 100 : Math.round((covered / total) * 100);
  const rows = coverage.byLayer
    .map((layer) => {
      const layerPercent =
        layer.total === 0 ? 100 : Math.round((layer.covered / layer.total) * 100);
      return `<li${layer.covered < layer.total ? ' class="partial"' : ''}>
          <span class="coverage-layer">${escapeHtml(layer.layer)}</span>
          <span class="coverage-bar"><i style="width:${layerPercent}%"></i></span>
          <span class="coverage-count">${layer.covered}/${layer.total}</span>
        </li>`;
    })
    .join('');
  return `
      <section class="coverage">
        <h3>Codebase coverage <b>${covered} of ${total} files</b> <span class="coverage-percent">${percent}%</span></h3>
        <p class="coverage-rule">${escapeHtml(coverage.rule)}</p>
        <ul class="coverage-layers">${rows}</ul>
        ${
          coverage.uncovered.length === 0
            ? '<p class="coverage-none">Nothing is left out at this level.</p>'
            : `<details class="coverage-missing">
          <summary>${coverage.uncovered.length} file${coverage.uncovered.length === 1 ? '' : 's'} this level does not draw</summary>
          <ul>${coverage.uncovered
            .map(
              (path) => `<li class="loc">${escapeHtml(path.replace(applicationPrefix, ''))}</li>`,
            )
            .join('')}</ul>
        </details>`
        }
      </section>`;
}

function renderHistoryCell(
  path: string,
  histories: Readonly<Record<string, FileHistory>>,
  repositorySlug: string,
): string {
  const history = histories[path];
  if (history === undefined) return '<td class="loc">—</td>';
  return `<td class="loc"><a href="https://github.com/${escapeHtml(repositorySlug)}/commit/${escapeHtml(history.sha)}" target="_blank" rel="noreferrer"><code>${escapeHtml(history.sha)}</code></a> ${escapeHtml(history.date)} · ${history.commits} commit${history.commits === 1 ? '' : 's'}<br><span class="subject">${escapeHtml(history.subject)}</span></td>`;
}

function renderBlueprints(
  blueprints: readonly BlueprintEntry[],
  histories: Readonly<Record<string, FileHistory>>,
  repositorySlug: string,
  applicationPrefix: string,
  statuses: StatusByNode | undefined,
): string {
  // A pattern the target branch had and this one does not still needs a row,
  // because a table cannot show a deletion by leaving the row out.
  const noFollowers: readonly string[] = [];
  const removed = [...(statuses ?? new Map())]
    .filter(([, status]) => status === 'removed')
    .map(([id]) => ({ id, file: '', followers: noFollowers }));
  return [...blueprints, ...removed]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(
      (blueprint) => `
      <tr class="row-${escapeHtml(statuses?.get(blueprint.id) ?? '')}"${blueprint.file === '' ? '' : ` data-source-key="file:${escapeHtml(blueprint.file)}" tabindex="0"`}>
        <td><code>${escapeHtml(blueprint.id)}</code></td>
        <td class="loc">${
          blueprint.file === ''
            ? '<span class="undeclared" title="A file here carries @FollowsBlueprint with this id, and no file anywhere in the repository declares it with @Blueprint. The id is a typo, or the declaring file was deleted and its followers were left behind.">nothing declares it</span>'
            : escapeHtml(blueprint.file.replace(applicationPrefix, ''))
        }</td>
        ${renderHistoryCell(blueprint.file, histories, repositorySlug)}
        <td class="num">${blueprint.followers.length}</td>
        <td>${
          blueprint.followers.length === 0
            ? '<span class="undeclared">none</span>'
            : `<details class="followers"><summary>${blueprint.followers.length} file${blueprint.followers.length === 1 ? '' : 's'}</summary><ul>${blueprint.followers
                .map(
                  (follower) =>
                    `<li class="loc" data-source-key="file:${escapeHtml(follower)}" tabindex="0">${escapeHtml(follower.replace(applicationPrefix, ''))}</li>`,
                )
                .join('')}</ul></details>`
        }</td>
      </tr>`,
    )
    .join('');
}

/**
 * The standards, each with its own history and a diff between any two commits.
 *
 * A rule that changed is more interesting than a rule that exists. The whole
 * text at every commit ships with the page — thirteen documents and their
 * history is about 150 KB — so picking two commits is a redraw rather than a
 * request, which is the only kind of interaction this page can have.
 */
function renderStandards(standards: readonly StandardEntry[], repositorySlug: string): string {
  const payload = {
    repositorySlug,
    documents: standards.map((standard) => ({
      path: standard.path,
      title: standard.title,
      rule: standard.rule,
      versions: standard.versions,
    })),
  };
  return `
    <div class="standards" data-standards>
      <div class="standard-picker">
        <span class="journey-picker-label">Document</span>
        <div class="standard-list">
          ${standards
            .map(
              (standard, index) =>
                `<button type="button" class="standard-choice" data-standard-index="${index}" aria-pressed="${index === 0}">
                  <span class="standard-title">${escapeHtml(standard.title)}</span>
                  <span class="standard-count">${standard.versions.length} version${standard.versions.length === 1 ? '' : 's'}</span>
                </button>`,
            )
            .join('')}
        </div>
      </div>
      <div class="standard-body">
        <p class="standard-rule" data-standard-rule></p>
        <div class="standard-timeline-head">
          <span class="journey-picker-label">History — click one commit, then another, to diff them</span>
          <span class="standard-range" data-standard-range></span>
        </div>
        <div class="standard-timeline" data-standard-timeline></div>
        <div class="standard-diff" data-standard-diff></div>
      </div>
      <script type="application/json">${embedJson(payload)}</script>
    </div>`;
}

const PAGE_STYLES = String.raw`
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
    --chip: #eef1f6;
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
      --chip: #212832;
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
    --chip: #212832;
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
__GRAPH_STYLES__
</style>
`.replace('__GRAPH_STYLES__', () => GRAPH_STYLES);

export function renderArchitecturePage(input: RenderInput): string {
  const {
    manifest,
    levels,
    slices,
    blueprints,
    files,
    coverage,
    sources,
    standards,
    histories,
    repositorySlug,
    statuses,
    report,
    unmarkedCount,
    layouts,
    journeys,
    journeyLayouts,
  } = input;
  const applicationPrefix = `apps/${manifest.application}/`;
  const renamedFrom = report?.renamedFrom ?? {};
  const fileRows = files
    .map((file) => {
      const cameFrom = renamedFrom[file.path];
      return `<tr class="row-${escapeHtml(statuses?.get('code')?.get(file.path) ?? '')}" data-container="${escapeHtml(file.container)}" data-layer="${escapeHtml(file.layer)}" data-context="${escapeHtml(file.feature ?? file.context)}" data-source-key="file:${escapeHtml(file.path)}" tabindex="0">
        <td class="loc">${escapeHtml(file.path.replace(applicationPrefix, ''))}${cameFrom === undefined ? '' : `<span class="renamed-from">← ${escapeHtml(cameFrom.replace(applicationPrefix, ''))}</span>`}</td>
        <td><span class="layer layer-${escapeHtml(file.layer)}">${escapeHtml(file.layer)}</span></td>
        <td>${escapeHtml(file.feature ?? file.context)}</td>
        <td class="num">${file.lineCount}</td>
        <td class="num">${file.exports.length}</td>
        <td class="num">${file.imports.filter((edge) => edge.targetFile !== null).length}</td>
        <td>${file.blueprints.map((id) => `<code class="bp-chip declares">${escapeHtml(id)}</code>`).join('')}${file.followsBlueprints.map((id) => `<code class="bp-chip">${escapeHtml(id)}</code>`).join('')}</td>
      </tr>`;
    })
    .join('');

  // A table that can only grow is not a diff. These rows have no source to
  // open, because the file is not in this tree to read.
  const removedRows = (report?.removedFiles ?? [])
    .map(
      (
        file,
      ) => `<tr class="row-removed" data-container="" data-layer="${escapeHtml(file.layer)}" data-context="${escapeHtml(file.context)}">
        <td class="loc">${escapeHtml(file.path.replace(applicationPrefix, ''))}</td>
        <td><span class="layer layer-${escapeHtml(file.layer)}">${escapeHtml(file.layer)}</span></td>
        <td>${escapeHtml(file.context)}</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td>gone on this branch</td>
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
          <tbody>${fileRows}${removedRows}</tbody>
        </table>
      </div>
      ${renderCoverage(
        coverage.find((each) => each.levelId === level.id),
        applicationPrefix,
      )}`
          : `
      ${renderGraph(
        level,
        layouts.get(level.id) ?? { nodes: [], edges: [], width: 0, height: 0 },
        statuses?.get(level.id),
      )}
      <details class="cards-panel">
        <summary>${level.nodes.length} block${level.nodes.length === 1 ? '' : 's'} in detail</summary>
        <div class="cards">${renderNodeCards(level)}</div>
      </details>
      ${renderCoverage(
        coverage.find((each) => each.levelId === level.id),
        applicationPrefix,
      )}`
      }
    </section>`,
    )
    .join('');

  const isDiff = statuses !== undefined;
  const delta = (label: string): string => {
    const moved = report?.deltas[label];
    if (moved === undefined || moved === 0) return '';
    return `<i class="delta">${moved > 0 ? '+' : '−'}${Math.abs(moved)}</i>`;
  };
  return `<title>${escapeHtml(manifest.name)} architecture${isDiff ? ' diff' : ''}</title>
${PAGE_STYLES}

<header class="top"><div class="wrap">
  <h1>${escapeHtml(manifest.name)} architecture${isDiff ? ' — what this branch moved' : ''}</h1>
  ${
    isDiff
      ? `<p class="diff-legend"><i class="swatch added"></i>added<i class="swatch changed"></i>changed<i class="swatch moved"></i>moved, same code<i class="swatch removed"></i>gone on this branch<span>Everything else is the same map, unchanged.</span></p>
  ${renderDiffCounts(report)}`
      : ''
  }
  <p class="lede">${escapeHtml(manifest.description)}</p>
  <ul class="stats">
    <li><b>${files.length}</b>source files${delta('source files')}</li>
    <li><b>${manifest.containers.length}</b>containers${delta('containers')}</li>
    <li><b>${slices.length}</b>bounded contexts</li>
    <li><b>${routeTotal}</b>HTTP routes${delta('HTTP routes')}</li>
    <li><b>${blueprints.length}</b>blueprints${delta('blueprints')}</li>
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
  <button role="tab" data-target="level-patterns" aria-selected="false">Blueprints</button>
  <button role="tab" data-target="level-standards" aria-selected="false">Standards</button>
</div></nav>

<main class="wrap">
  ${levelSections}

  <section class="level" id="level-slice" hidden>
    <h2>Level 3.5 — User actions</h2>
    <p class="summary">One thing a person does, drawn end to end: the components that trigger it, the endpoint it reaches, and every function behind that endpoint down to the tables and external systems. An action is an exported hook in a query module, so the names are the ones whoever wrote them chose, and the chain comes from the calls as written.</p>
    ${renderJourneys(journeys, journeyLayouts, statuses?.get('code'))}
    <p class="note">Endpoints below sit behind no user action. Some are deliberate — the admin bootstrap has no screen, and the test seed is never shipped to one — and the rest are the back end of a feature whose front end does not exist yet. The generator reports the fact and does not guess which.</p>
    ${renderUnreachedByAction(journeys, slices)}
    ${renderCoverage(
      coverage.find((each) => each.levelId === 'slice'),
      applicationPrefix,
    )}
  </section>

  <section class="level" id="level-patterns" hidden>
    <h2>Blueprints</h2>
    <p class="summary">One canonical example per pattern, marked in the code it is an example of. A file declares one with a <code>@Blueprint</code> block; every file that copies it carries <code>// @FollowsBlueprint &lt;id&gt;</code>, and those are the followers counted here. Declarations are repository-wide and followers are per application, so a blueprint declared for another application still appears when a file here follows it. Coverage is partial by design, which is why this sits beside the graphs rather than inside them: a position says where a node is, a blueprint says which example it copies. Clicking a row opens the declaring file.</p>
    <div class="table-scroll">
      <table class="clickable">
        <thead><tr><th>Blueprint</th><th>Declared in</th><th>Last change</th><th class="num">Followers</th><th>Following files</th></tr></thead>
        <tbody>${renderBlueprints(blueprints, histories, repositorySlug, applicationPrefix, statuses?.get('blueprint'))}</tbody>
      </table>
    </div>
  </section>

  <section class="level" id="level-standards" hidden>
    <h2>Standards</h2>
    <p class="summary">What the rules are, and what they were. A blueprint says which example to copy; a standard says what the rule is and which gate holds it. These belong to the repository rather than to this application, so a change here moves every application at once — which is why the history matters more than the current text.</p>
    ${renderStandards(standards, repositorySlug)}
  </section>
</main>

<script type="application/json" id="page-sources">${embedJson(sources)}</script>

<dialog class="code-modal" id="code-modal">
  <div class="code-modal-head">
    <h3 data-code-name></h3>
    <span class="code-chip layer" data-code-layer></span>
    <span class="code-chip" data-code-blueprint></span>
    <span class="code-chip metric" data-code-metrics></span>
    <button type="button" class="code-modal-view" data-code-view hidden></button>
    <button type="button" class="code-modal-close" data-code-close>Close</button>
    <span class="loc" data-code-location></span>
  </div>
  <pre><code class="code-body" data-code-body></code></pre>
</dialog>

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

  const codeModal = document.getElementById('code-modal');
  codeModal?.querySelector('[data-code-close]')?.addEventListener('click', () => codeModal.close());
  // A native dialog fills its whole box, so a click on the backdrop reports the
  // dialog itself as the target; anything inside reports a child.
  codeModal?.addEventListener('click', (event) => {
    if (event.target === codeModal) codeModal.close();
  });
</script>
<script>${GRAPH_RUNTIME_SCRIPT}</script>
`;
}

/**
 * The landing page for the folder, one card per application.
 *
 * Each map is a page of its own so it can be published on its own, which leaves
 * a reader arriving at the folder with nowhere to start unless something lists
 * them.
 */
export function renderArchitectureIndex(manifests: readonly ArchitectureManifest[]): string {
  const cards = manifests
    .map(
      (manifest) => `
      <a class="app-card" href="./${escapeHtml(manifest.application)}-architecture.html">
        <h2>${escapeHtml(manifest.name)}</h2>
        <p>${escapeHtml(manifest.description)}</p>
        <ul class="app-facts">
          ${manifest.containers
            .map(
              (container) =>
                `<li><span class="app-icon">${container.icon}</span>${escapeHtml(container.name)}</li>`,
            )
            .join('')}
        </ul>
      </a>`,
    )
    .join('');

  return `<title>Architecture maps</title>
${PAGE_STYLES}
<style>
  .app-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr)); }
  .app-card {
    display: block;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 1rem 1.1rem;
    color: inherit;
    text-decoration: none;
    min-width: 0;
  }
  .app-card:hover { border-color: var(--accent); }
  .app-card h2 { margin: 0 0 .35rem; font-size: 1rem; }
  .app-card p { margin: 0 0 .6rem; color: var(--muted); font-size: .82rem; line-height: 1.5; }
  .app-facts { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .35rem; }
  .app-facts li {
    font: .68rem/1.6 var(--font-mono);
    background: var(--panel-sunk);
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: .1rem .4rem;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .app-icon { margin-right: .3rem; }
</style>

<header class="top"><div class="wrap">
  <h1>Architecture maps</h1>
  <p class="lede">One generated map per application, at five levels each, from the same generator and the same rules. Position comes from the path, edges come from real imports, and nothing on a map is authored by hand except the manifest each application carries.</p>
</div></header>

<main class="wrap">
  <div class="app-grid">${cards}</div>
</main>
`;
}
