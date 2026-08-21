export interface CoverageBucket {
  readonly application: string;
  readonly layer: string;
  readonly files: number;
  readonly blueprints: number;
  readonly followers: number;
  readonly markedFiles: number;
  readonly unmarkedPaths: readonly string[];
}

const PERCENTAGE_SCALE = 100;

const COVERAGE_BANDS: readonly (readonly [number, string])[] = [
  [100, 'full'],
  [90, 'high'],
  [70, 'fair'],
  [40, 'low'],
  [1, 'poor'],
  [0, 'none'],
];

function bandFor(percentage: number): string {
  const band = COVERAGE_BANDS.find(([floor]) => percentage >= floor);
  return band === undefined ? 'none' : band[1];
}

function toPercentage(marked: number, total: number): number {
  return total === 0 ? PERCENTAGE_SCALE : Math.round((marked / total) * PERCENTAGE_SCALE);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

interface Cell {
  readonly files: number;
  readonly marked: number;
}

function sumCells(cells: readonly Cell[]): Cell {
  return cells.reduce(
    (total, cell) => ({ files: total.files + cell.files, marked: total.marked + cell.marked }),
    { files: 0, marked: 0 },
  );
}

function renderCell(cell: Cell | undefined, extraClass = ''): string {
  if (cell === undefined || cell.files === 0) {
    return '<td class="empty" title="no files"></td>';
  }
  const percentage = toPercentage(cell.marked, cell.files);
  const title = `${cell.marked} of ${cell.files} files marked`;
  const classes = `band-${bandFor(percentage)}${extraClass === '' ? '' : ` ${extraClass}`}`;
  return `<td class="${classes}" title="${title}"><b>${percentage}%</b><span>${cell.files}</span></td>`;
}

const STYLE = `
:root { color-scheme: light dark; --ink: #1a1a1a; --muted: #6b6b6b; --line: #e2e2e2; --paper: #ffffff; --sunk: #f7f7f6; }
@media (prefers-color-scheme: dark) {
  :root { --ink: #ececec; --muted: #9b9b9b; --line: #333; --paper: #161616; --sunk: #1e1e1e; }
}
* { box-sizing: border-box; }
body { margin: 0; padding: 32px; background: var(--paper); color: var(--ink);
  font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: -0.01em; }
p.lede { margin: 0 0 24px; color: var(--muted); max-width: 60ch; }
.totals { display: flex; gap: 28px; padding: 16px 20px; background: var(--sunk);
  border: 1px solid var(--line); border-radius: 10px; margin-bottom: 24px; width: fit-content; }
.totals div { display: flex; flex-direction: column; }
.totals dt { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
.totals dd { margin: 2px 0 0; font-size: 22px; font-weight: 650; font-variant-numeric: tabular-nums; }
table { border-collapse: separate; border-spacing: 2px; }
th { font-size: 12px; font-weight: 600; color: var(--muted); text-align: left; padding: 4px 8px; }
th.col { text-align: center; }
td { width: 74px; height: 42px; text-align: center; border-radius: 6px; font-variant-numeric: tabular-nums; }
td b { display: block; font-size: 13px; font-weight: 650; }
td span { display: block; font-size: 10px; opacity: .72; }
td.empty { background: repeating-linear-gradient(45deg, transparent, transparent 4px, var(--line) 4px, var(--line) 5px); }
.band-full { background: #1a7f37; color: #fff; }
.band-high { background: #4a9e52; color: #fff; }
.band-fair { background: #a6c34f; color: #1a1a1a; }
.band-low  { background: #e3b341; color: #1a1a1a; }
.band-poor { background: #db8a3a; color: #fff; }
.band-none { background: #c3402f; color: #fff; }
tr.total td, td.total { outline: 2px solid var(--line); }
tr.total th, th.total { color: var(--ink); font-weight: 700; }
.legend { display: flex; gap: 6px; align-items: center; margin: 18px 0 28px; font-size: 12px; color: var(--muted); }
.legend i { width: 26px; height: 14px; border-radius: 3px; display: inline-block; }
details { margin-top: 8px; border-top: 1px solid var(--line); padding-top: 16px; }
summary { cursor: pointer; font-weight: 600; }
h3 { font-size: 13px; margin: 18px 0 6px; }
ul { margin: 0; padding-left: 18px; color: var(--muted); font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; }
`;

function renderLegend(): string {
  const swatches = COVERAGE_BANDS.map(
    ([floor, name]) => `<i class="band-${name}" title="${floor}% and above"></i>`,
  ).join('');
  return `<div class="legend"><span>fully marked</span>${swatches}<span>nothing marked</span></div>`;
}

function renderUnmarked(buckets: readonly CoverageBucket[]): string {
  const withGaps = [...buckets]
    .filter((bucket) => bucket.unmarkedPaths.length > 0)
    .sort((first, second) => second.unmarkedPaths.length - first.unmarkedPaths.length);
  if (withGaps.length === 0) {
    return '<p>Every file in a covered layer carries a blueprint or a follower marker.</p>';
  }
  const total = withGaps.reduce((count, bucket) => count + bucket.unmarkedPaths.length, 0);
  const sections = withGaps
    .map((bucket) => {
      const items = [...bucket.unmarkedPaths]
        .sort()
        .map((filePath) => `<li>${escapeHtml(filePath)}</li>`)
        .join('');
      return `<h3>${escapeHtml(bucket.application)} / ${escapeHtml(bucket.layer)} — ${bucket.unmarkedPaths.length}</h3><ul>${items}</ul>`;
    })
    .join('');
  return `<details><summary>${total} unmarked files</summary>${sections}</details>`;
}

export function renderCoveragePage(
  buckets: readonly CoverageBucket[],
  excludedDeclarationFiles: number,
  testFiles: number,
): string {
  const applications = [...new Set(buckets.map((bucket) => bucket.application))].sort();
  const layers = [...new Set(buckets.map((bucket) => bucket.layer))].sort();

  const cellAt = new Map<string, Cell>();
  for (const bucket of buckets) {
    const key = `${bucket.application}|${bucket.layer}`;
    const existing = cellAt.get(key) ?? { files: 0, marked: 0 };
    cellAt.set(key, {
      files: existing.files + bucket.files,
      marked: existing.marked + bucket.markedFiles,
    });
  }

  const header = applications
    .map((application) => `<th class="col">${escapeHtml(application)}</th>`)
    .join('');

  const rows = layers
    .map((layer) => {
      const cells = applications.map((application) => cellAt.get(`${application}|${layer}`));
      const rowTotal = sumCells(cells.filter((cell): cell is Cell => cell !== undefined));
      const body = cells.map((cell) => renderCell(cell)).join('');
      return `<tr><th>${escapeHtml(layer)}</th>${body}${renderCell(rowTotal, 'total')}</tr>`;
    })
    .join('');

  const columnTotals = applications.map((application) =>
    sumCells(
      layers
        .map((layer) => cellAt.get(`${application}|${layer}`))
        .filter((cell): cell is Cell => cell !== undefined),
    ),
  );
  const grandTotal = sumCells(columnTotals);
  const totalRow = `<tr class="total"><th class="total">all</th>${columnTotals
    .map((cell) => renderCell(cell))
    .join('')}${renderCell(grandTotal)}</tr>`;

  const blueprints = buckets.reduce((count, bucket) => count + bucket.blueprints, 0);
  const followers = buckets.reduce((count, bucket) => count + bucket.followers, 0);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blueprint coverage</title>
<style>${STYLE}</style>
</head>
<body>
<h1>Blueprint coverage</h1>
<p class="lede">Which code carries a pattern marker, by application and layer. A cell is the share of
files in that bucket holding a <code>@Blueprint</code> block or a <code>@FollowsBlueprint</code>
comment; the small number is how many files the bucket holds. Generated by
<code>blueprint-heatmap.ts</code>; do not edit by hand.</p>
<dl class="totals">
<div><dt>Files</dt><dd>${grandTotal.files}</dd></div>
<div><dt>Blueprints</dt><dd>${blueprints}</dd></div>
<div><dt>Followers</dt><dd>${followers}</dd></div>
<div><dt>Marked</dt><dd>${toPercentage(grandTotal.marked, grandTotal.files)}%</dd></div>
<div><dt>Tests</dt><dd>${testFiles}</dd></div>
</dl>
${renderLegend()}
<table>
<thead><tr><th></th>${header}<th class="col total">all</th></tr></thead>
<tbody>${rows}${totalRow}</tbody>
</table>
<p class="lede">Ambient declaration files are excluded from every percentage, because there is no
shape to copy in one. ${excludedDeclarationFiles} file(s) are excluded on that ground.</p>
${renderUnmarked(buckets)}
</body>
</html>
`;
}
