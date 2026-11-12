import { posix } from 'node:path';

export interface SourceDocument {
  readonly path: string;
  readonly content: string;
}

export interface WikiPage {
  readonly name: string;
  readonly content: string;
}

export interface WikiSource {
  readonly repository: string;
  readonly commit: string;
}

interface IndexSection {
  readonly name: string;
  readonly heading: string;
  readonly introduction: string;
  readonly directory: string;
  readonly newestFirst: boolean;
}

const HOME_PATH = 'README.md';
const HOME_PAGE = 'Home';
const SIDEBAR_PAGE = '_Sidebar';
const FOOTER_PAGE = '_Footer';
const DOCS_DIRECTORY = 'docs/';
const MARKDOWN_EXTENSION = '.md';
const ROOT_SOURCES: ReadonlySet<string> = new Set(['README.md', 'CLAUDE.md']);
const APP_SOURCE = /^apps\/[^/]+\/[^/]+\.md$/;
const FENCE = /^\s*(```|~~~)/;
const INLINE_LINK = /(!?)\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g;
const REFERENCE_DEFINITION = /^(\s*\[[^\]]+\]:\s*)(\S+)(.*)$/;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const RAW_EXTENSION = /\.(png|jpe?g|gif|svg|webp|webm|mp4)$/i;
const TITLE_LINE = /^# .+$/m;
const TITLE_MARKER_LENGTH = '# '.length;
const FEATURES_DIRECTORY = 'docs/features/';
const PARENT_SEGMENT = '..';

const FEATURES_PAGE = 'Features';
const FEATURES_HEADING = 'Features';
const FEATURES_INTRODUCTION =
  'Each shipped feature has a folder with its spec, plan, validation reports and friction log. They stay in the repository, so each line opens its folder there.';
const SPEC_FILE = /\/spec\/spec\.md$/;
const FEATURE_FOLDER = /^docs\/features\/[^/]+\/[^/]+\//;
const FEATURE_FOLDER_DEPTH = 4;

export const GENERATED_REPORTS: readonly (readonly [string, string])[] = [
  ['docs/standards/hotspots.md', 'Hotspots: the files that change most'],
  ['docs/standards/temporal-coupling.md', 'Temporal coupling: files that change together'],
  ['docs/standards/convention-drift.md', 'Convention drift: where the code leaves its blueprints'],
  ['docs/standards/rule-provenance.md', 'Rule provenance: which defect each rule answers'],
  ['docs/standards/blueprint-defects.md', 'Blueprint defects'],
  [
    '.claude/skills/blueprint/blueprint-index.md',
    'Blueprint index: the canonical example of each layer',
  ],
];

const PUBLISHED_PAGES: readonly (readonly [string, string])[] = [
  ['', 'Architecture maps: every app at five levels, interactive'],
  ['reports/blueprint-coverage.html', 'Blueprint coverage heatmap'],
  ['reports/weak-points.html', 'Weak points'],
  ['reports/working-conditions.html', 'Working conditions'],
];

const REPORTS_PAGE = 'Reports';
const REPORTS_HEADING = 'Reports';
const REPORTS_INTRODUCTION =
  'Generated from the code on every merge to `main`, so they describe the commit in the footer.';
const PUBLISHED_HEADING = '## Interactive, on GitHub Pages';
const PUBLISHED_INTRODUCTION =
  'These are HTML pages the wiki cannot hold. They are rebuilt only when someone runs the `architecture` workflow from the Actions tab, so they can be older than this page.';
const HIDDEN_PREFIX = '.';

const START_HERE: readonly (readonly [string, string])[] = [
  ['docs/how-it-is-built.md', 'How it is built'],
  ['docs/architecture.md', 'Architecture'],
  ['docs/flows.md', 'Deploy flows'],
  ['docs/local-dev.md', 'Local development'],
  ['docs/adding-an-app.md', 'Adding an app'],
  ['docs/adding-a-fullstack-app.md', 'Adding a full-stack app'],
  ['docs/aws-setup.md', 'AWS setup'],
  ['docs/operator-backlog.md', 'Operator backlog'],
  ['docs/architecture/README.md', 'Architecture maps'],
  ['CLAUDE.md', 'Agent instructions'],
];

const INDEX_SECTIONS: readonly IndexSection[] = [
  {
    name: 'Apps',
    heading: 'Apps',
    introduction: 'The README, vocabulary and contracts of each app under `apps/`.',
    directory: 'apps/',
    newestFirst: false,
  },
  {
    name: 'Standards',
    heading: 'Code standards',
    introduction: 'How code is written here. Oxlint, the git hooks and CI enforce most of it.',
    directory: 'docs/standards/',
    newestFirst: false,
  },
  {
    name: 'Architecture-decisions',
    heading: 'Architecture decisions',
    introduction: 'Every ADR, newest first.',
    directory: 'docs/adr/',
    newestFirst: true,
  },
  {
    name: 'Root-cause-analyses',
    heading: 'Root-cause analyses',
    introduction: 'One Dantotsu per real defect: impact, causal chain, countermeasure.',
    directory: 'docs/dantotsus/',
    newestFirst: false,
  },
  {
    name: 'Knowledge',
    heading: 'Knowledge',
    introduction: 'Vendor surprises and reusable lessons. A hook prints the entry that applies.',
    directory: 'docs/knowledge/',
    newestFirst: false,
  },
  {
    name: 'Quality',
    heading: 'Quality',
    introduction: 'Targets, weak points and the cost of a feature.',
    directory: 'docs/quality/',
    newestFirst: false,
  },
];

// @FollowsBlueprint utils-pure-module
export function isWikiSource(path: string): boolean {
  if (!path.endsWith(MARKDOWN_EXTENSION)) return false;
  return ROOT_SOURCES.has(path) || path.startsWith(DOCS_DIRECTORY) || APP_SOURCE.test(path);
}

export function pageNameFor(path: string): string {
  if (path === HOME_PATH) return HOME_PAGE;
  const visible = path.startsWith(HIDDEN_PREFIX) ? path.slice(HIDDEN_PREFIX.length) : path;
  const withoutDocs = visible.startsWith(DOCS_DIRECTORY)
    ? visible.slice(DOCS_DIRECTORY.length)
    : visible;
  return withoutDocs.slice(0, -MARKDOWN_EXTENSION.length).replaceAll('/', '-');
}

export function readTitle(document: SourceDocument): string {
  const match = TITLE_LINE.exec(document.content);
  return match === null ? pageNameFor(document.path) : match[0].slice(TITLE_MARKER_LENGTH).trim();
}

function resolveTarget(sourcePath: string, target: string): string | null {
  const joined = target.startsWith('/')
    ? target.slice(1)
    : posix.join(posix.dirname(sourcePath), target);
  const normalized = posix.normalize(joined).replace(/\/$/, '');
  return normalized.startsWith(PARENT_SEGMENT) ? null : normalized;
}

export function rewriteTarget(
  target: string,
  sourcePath: string,
  pageNames: ReadonlyMap<string, string>,
  source: WikiSource,
): string {
  if (URL_SCHEME.test(target) || target.startsWith('#')) return target;
  const anchorStart = target.indexOf('#');
  const pathPart = anchorStart === -1 ? target : target.slice(0, anchorStart);
  const anchor = anchorStart === -1 ? '' : target.slice(anchorStart);
  const resolved = resolveTarget(sourcePath, pathPart);
  if (resolved === null) return target;
  const pageName = pageNames.get(resolved);
  if (pageName !== undefined) return `${pageName}${anchor}`;
  const kind = RAW_EXTENSION.test(resolved) ? 'raw' : 'blob';
  return `https://github.com/${source.repository}/${kind}/${source.commit}/${resolved}${anchor}`;
}

function rewriteLine(
  line: string,
  sourcePath: string,
  pageNames: ReadonlyMap<string, string>,
  source: WikiSource,
): string {
  if (REFERENCE_DEFINITION.test(line)) {
    return line.replace(
      REFERENCE_DEFINITION,
      (_match: string, label: string, target: string, rest: string) =>
        `${label}${rewriteTarget(target, sourcePath, pageNames, source)}${rest}`,
    );
  }
  return line.replaceAll(
    INLINE_LINK,
    (_match: string, bang: string, text: string, target: string, title: string | undefined) =>
      `${bang}[${text}](${rewriteTarget(target, sourcePath, pageNames, source)}${title ?? ''})`,
  );
}

export function rewriteLinks(
  document: SourceDocument,
  pageNames: ReadonlyMap<string, string>,
  source: WikiSource,
): string {
  let isInsideFence = false;
  return document.content
    .split('\n')
    .map((line) => {
      if (FENCE.test(line)) {
        isInsideFence = !isInsideFence;
        return line;
      }
      return isInsideFence ? line : rewriteLine(line, document.path, pageNames, source);
    })
    .join('\n');
}

export function mapPageNames(documents: readonly SourceDocument[]): ReadonlyMap<string, string> {
  const pageNames = new Map<string, string>();
  const pathByName = new Map<string, string>();
  for (const { path } of documents) {
    const name = pageNameFor(path);
    const taken = pathByName.get(name.toLowerCase());
    if (taken !== undefined) {
      throw new Error(`${path} and ${taken} both map to the wiki page ${name}`);
    }
    pathByName.set(name.toLowerCase(), path);
    pageNames.set(path, name);
  }
  return pageNames;
}

function groupOf(path: string, directory: string): string {
  const rest = path.slice(directory.length);
  const slash = rest.indexOf('/');
  return slash === -1 ? '' : rest.slice(0, slash);
}

export function renderFeatureIndex(
  documents: readonly SourceDocument[],
  source: WikiSource,
): string {
  const titleByFolder = new Map<string, string>();
  const features = documents
    .filter((document) => FEATURE_FOLDER.test(document.path))
    .toSorted(
      (left, right) => Number(SPEC_FILE.test(right.path)) - Number(SPEC_FILE.test(left.path)),
    );
  for (const document of features) {
    const folder = document.path.split('/').slice(0, FEATURE_FOLDER_DEPTH).join('/');
    if (!titleByFolder.has(folder)) titleByFolder.set(folder, readTitle(document));
  }
  const linesByApp = new Map<string, string[]>();
  const folders = [...titleByFolder.entries()].toSorted(([left], [right]) =>
    left.localeCompare(right),
  );
  for (const [folder, title] of folders) {
    const app = posix.basename(posix.dirname(folder));
    const url = `https://github.com/${source.repository}/tree/${source.commit}/${folder}`;
    const lines = linesByApp.get(app) ?? [];
    lines.push(`- [${posix.basename(folder)}](${url}): ${title}`);
    linesByApp.set(app, lines);
  }
  const body = [...linesByApp.entries()].map(([app, lines]) => `## ${app}\n\n${lines.join('\n')}`);
  return [`# ${FEATURES_HEADING}`, FEATURES_INTRODUCTION, ...body].join('\n\n') + '\n';
}

export function renderIndex(section: IndexSection, documents: readonly SourceDocument[]): string {
  const members = documents
    .filter((document) => document.path.startsWith(section.directory))
    .toSorted((left, right) =>
      section.newestFirst
        ? right.path.localeCompare(left.path)
        : left.path.localeCompare(right.path),
    );
  const groups = new Map<string, string[]>();
  for (const document of members) {
    const group = groupOf(document.path, section.directory);
    const lines = groups.get(group) ?? [];
    lines.push(`- [${readTitle(document)}](${pageNameFor(document.path)})`);
    groups.set(group, lines);
  }
  const body = [...groups.entries()].map(([group, lines]) =>
    group === '' ? lines.join('\n') : `## ${group}\n\n${lines.join('\n')}`,
  );
  return [`# ${section.heading}`, section.introduction, ...body].join('\n\n') + '\n';
}

function renderSidebar(documents: readonly SourceDocument[]): string {
  const present = new Set(documents.map((document) => document.path));
  const startHere = START_HERE.filter(([path]) => present.has(path)).map(
    ([path, label]) => `- [${label}](${pageNameFor(path)})`,
  );
  const sections = [
    ...INDEX_SECTIONS.map((section) => `- [${section.heading}](${section.name})`),
    `- [${FEATURES_HEADING}](${FEATURES_PAGE})`,
    `- [${REPORTS_HEADING}](${REPORTS_PAGE})`,
  ];
  return (
    [
      `**[Home](${HOME_PAGE})**`,
      '**Start here**',
      startHere.join('\n'),
      '**Browse**',
      sections.join('\n'),
    ].join('\n\n') + '\n'
  );
}

export function pagesUrlFor(repository: string): string {
  const slash = repository.indexOf('/');
  return `https://${repository.slice(0, slash).toLowerCase()}.github.io/${repository.slice(slash + 1)}/`;
}

export function renderReports(documents: readonly SourceDocument[], source: WikiSource): string {
  const present = new Set(documents.map((document) => document.path));
  const reports = GENERATED_REPORTS.filter(([path]) => present.has(path)).map(
    ([path, label]) => `- [${label}](${pageNameFor(path)})`,
  );
  const pagesUrl = pagesUrlFor(source.repository);
  const published = PUBLISHED_PAGES.map(([path, label]) => `- [${label}](${pagesUrl}${path})`);
  return (
    [
      `# ${REPORTS_HEADING}`,
      REPORTS_INTRODUCTION,
      reports.join('\n'),
      PUBLISHED_HEADING,
      PUBLISHED_INTRODUCTION,
      published.join('\n'),
    ].join('\n\n') + '\n'
  );
}

function renderFooter(source: WikiSource): string {
  const commitUrl = `https://github.com/${source.repository}/commit/${source.commit}`;
  return `Generated from the repository at [\`${source.commit.slice(0, 9)}\`](${commitUrl}). Edit the markdown in the repository, not here: every merge to \`main\` rewrites the wiki.\n`;
}

export function buildWiki(documents: readonly SourceDocument[], source: WikiSource): WikiPage[] {
  const published = documents.filter((document) => !document.path.startsWith(FEATURES_DIRECTORY));
  const pageNames = mapPageNames(published);
  const pages = published.map((document) => ({
    name: pageNameFor(document.path),
    content: rewriteLinks(document, pageNames, source),
  }));
  const generated = new Set(GENERATED_REPORTS.map(([path]) => path));
  const written = published.filter((document) => !generated.has(document.path));
  const indexes = INDEX_SECTIONS.map((section) => ({
    name: section.name,
    content: renderIndex(section, written),
  }));
  indexes.push(
    { name: FEATURES_PAGE, content: renderFeatureIndex(documents, source) },
    { name: REPORTS_PAGE, content: renderReports(published, source) },
  );
  const reserved = new Set(indexes.map((index) => index.name.toLowerCase()));
  const clash = pages.find((page) => reserved.has(page.name.toLowerCase()));
  if (clash !== undefined) throw new Error(`The page ${clash.name} clashes with a generated index`);
  return [
    ...pages,
    ...indexes,
    { name: SIDEBAR_PAGE, content: renderSidebar(published) },
    { name: FOOTER_PAGE, content: renderFooter(source) },
  ];
}
