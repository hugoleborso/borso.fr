import { describe, expect, it } from 'vitest';
import {
  buildWiki,
  isWikiSource,
  mapPageNames,
  pageNameFor,
  pagesUrlFor,
  readTitle,
  renderFeatureIndex,
  renderIndex,
  renderReports,
  rewriteLinks,
  rewriteTarget,
} from './wiki-pages.core';

const SOURCE = { repository: 'owner/repo', commit: 'abcdef0123456789' };
const BLOB = 'https://github.com/owner/repo/blob/abcdef0123456789';
const TREE = 'https://github.com/owner/repo/tree/abcdef0123456789';
const RAW = 'https://github.com/owner/repo/raw/abcdef0123456789';

describe('isWikiSource', () => {
  it.each([
    ['README.md', true],
    ['CLAUDE.md', true],
    ['docs/adr/2026-01-01T0000-a.md', true],
    ['apps/pragma/README.md', true],
    ['apps/pragma/site/README.md', false],
    ['docs/architecture/reports/x.html', false],
    ['package.json', false],
    ['scripts/notes.md', false],
  ])('%s is %s', (path, expected) => {
    expect(isWikiSource(path)).toBe(expected);
  });
});

describe('pageNameFor', () => {
  it('names the root README Home', () => {
    expect(pageNameFor('README.md')).toBe('Home');
  });

  it('drops the docs folder and flattens the rest', () => {
    expect(pageNameFor('docs/features/pragma/x/spec/spec.md')).toBe('features-pragma-x-spec-spec');
  });

  it('drops the dot of a hidden folder', () => {
    expect(pageNameFor('.claude/skills/blueprint/blueprint-index.md')).toBe(
      'claude-skills-blueprint-blueprint-index',
    );
  });

  it('keeps the apps folder', () => {
    expect(pageNameFor('apps/talos/VOCABULARY.md')).toBe('apps-talos-VOCABULARY');
  });
});

describe('readTitle', () => {
  it('reads the first level-one heading', () => {
    expect(readTitle({ path: 'docs/a.md', content: 'intro\n# The title \n## sub' })).toBe(
      'The title',
    );
  });

  it('falls back to the page name', () => {
    expect(readTitle({ path: 'docs/a.md', content: '## only a sub' })).toBe('a');
  });
});

describe('rewriteTarget', () => {
  const pageNames = new Map([['docs/flows.md', 'flows']]);
  const rewrite = (target: string, from = 'docs/architecture.md'): string =>
    rewriteTarget(target, from, pageNames, SOURCE);

  it('keeps a URL and an anchor', () => {
    expect(rewrite('https://example.com')).toBe('https://example.com');
    expect(rewrite('mailto:a@b.c')).toBe('mailto:a@b.c');
    expect(rewrite('#topology')).toBe('#topology');
  });

  it('points a page to its wiki name and keeps the anchor', () => {
    expect(rewrite('./flows.md#safety-nets')).toBe('flows#safety-nets');
    expect(rewrite('flows.md')).toBe('flows');
  });

  it('resolves a path from the repository root', () => {
    expect(rewrite('/docs/flows.md')).toBe('flows');
  });

  it('points any other file at its blob on the commit', () => {
    expect(rewrite('../CLAUDE.md#layout')).toBe(`${BLOB}/CLAUDE.md#layout`);
    expect(rewrite('../apps/pragma/')).toBe(`${BLOB}/apps/pragma`);
  });

  it('points an image at its raw file', () => {
    expect(rewrite('shot.webm')).toBe(`${RAW}/docs/shot.webm`);
    expect(rewrite('shot.PNG')).toBe(`${RAW}/docs/shot.PNG`);
  });

  it('leaves a path that leaves the repository alone', () => {
    expect(rewrite('../../outside.md')).toBe('../../outside.md');
  });
});

describe('rewriteLinks', () => {
  const pageNames = new Map([['docs/flows.md', 'flows']]);

  it('rewrites inline links, images and reference definitions outside fences', () => {
    const content = [
      'See [flows](flows.md "Flows") and ![map](map.png).',
      '[ref]: flows.md#a',
      '```',
      '[kept](flows.md)',
      '```',
      'After [flows](./flows.md).',
    ].join('\n');
    expect(rewriteLinks({ path: 'docs/a.md', content }, pageNames, SOURCE)).toBe(
      [
        'See [flows](flows "Flows") and ![map](' + RAW + '/docs/map.png).',
        '[ref]: flows#a',
        '```',
        '[kept](flows.md)',
        '```',
        'After [flows](flows).',
      ].join('\n'),
    );
  });
});

describe('mapPageNames', () => {
  it('maps each path to its name', () => {
    expect(mapPageNames([{ path: 'docs/a.md', content: '' }]).get('docs/a.md')).toBe('a');
  });

  it('refuses two paths that share a name, whatever the case', () => {
    expect(() =>
      mapPageNames([
        { path: 'docs/a-b.md', content: '' },
        { path: 'docs/A/b.md', content: '' },
      ]),
    ).toThrow('docs/A/b.md and docs/a-b.md both map to the wiki page A-b');
  });
});

describe('renderIndex', () => {
  const documents = [
    { path: 'docs/adr/2026-01-01T0000-old.md', content: '# Old' },
    { path: 'docs/adr/2026-02-01T0000-new.md', content: '# New' },
    { path: 'docs/flows.md', content: '# Flows' },
  ];

  it('lists newest first without groups', () => {
    const section = {
      name: 'Architecture-decisions',
      heading: 'Decisions',
      introduction: 'All of them.',
      directory: 'docs/adr/',
      newestFirst: true,
    };
    expect(renderIndex(section, documents)).toBe(
      '# Decisions\n\nAll of them.\n\n- [New](adr-2026-02-01T0000-new)\n- [Old](adr-2026-01-01T0000-old)\n',
    );
  });
});

describe('renderIndex grouped by folder', () => {
  it('lists oldest first under one heading per folder', () => {
    const section = {
      name: 'Apps',
      heading: 'Apps',
      introduction: 'Each app.',
      directory: 'apps/',
      newestFirst: false,
    };
    const documents = [
      { path: 'apps/talos/VOCABULARY.md', content: '# Talos words' },
      { path: 'apps/pragma/README.md', content: '# pragma' },
      { path: 'apps/talos/README.md', content: '# talos' },
    ];
    expect(renderIndex(section, documents)).toBe(
      '# Apps\n\nEach app.\n\n## pragma\n\n- [pragma](apps-pragma-README)\n\n## talos\n\n- [talos](apps-talos-README)\n- [Talos words](apps-talos-VOCABULARY)\n',
    );
  });
});

describe('renderFeatureIndex', () => {
  it('lists each feature folder once, titled by its spec, linked to the repository', () => {
    const documents = [
      { path: 'docs/features/pragma/x/kaizen.md', content: '# X friction' },
      { path: 'docs/features/pragma/x/spec/spec.md', content: '# X spec' },
      { path: 'docs/features/pragma/y/kaizen.md', content: '# Y friction' },
      { path: 'docs/features/meta/lessons/kaizen.md', content: '# Lessons' },
      { path: 'docs/features/pragma/README.md', content: '# Not a feature' },
      { path: 'docs/flows.md', content: '# Flows' },
    ];
    expect(renderFeatureIndex(documents, SOURCE)).toBe(
      [
        '# Features',
        '',
        'Each shipped feature has a folder with its spec, plan, validation reports and friction log. They stay in the repository, so each line opens its folder there.',
        '',
        '## meta',
        '',
        `- [lessons](${TREE}/docs/features/meta/lessons): Lessons`,
        '',
        '## pragma',
        '',
        `- [x](${TREE}/docs/features/pragma/x): X spec`,
        `- [y](${TREE}/docs/features/pragma/y): Y friction`,
        '',
      ].join('\n'),
    );
  });
});

describe('pagesUrlFor', () => {
  it('lowercases the owner and keeps the repository name', () => {
    expect(pagesUrlFor('Owner/My.Repo')).toBe('https://owner.github.io/My.Repo/');
  });
});

describe('renderReports', () => {
  it('lists the generated reports present, then the pages on GitHub Pages', () => {
    const documents = [
      { path: 'docs/standards/hotspots.md', content: '# Hotspots' },
      { path: '.claude/skills/blueprint/blueprint-index.md', content: '# Blueprint index' },
    ];
    expect(renderReports(documents, SOURCE)).toBe(
      [
        '# Reports',
        '',
        'Generated from the code on every merge to `main`, so they describe the commit in the footer.',
        '',
        '- [Hotspots: the files that change most](standards-hotspots)',
        '- [Blueprint index: the canonical example of each layer](claude-skills-blueprint-blueprint-index)',
        '',
        '## Interactive, on GitHub Pages',
        '',
        'These are HTML pages the wiki cannot hold. They are rebuilt only when someone runs the `architecture` workflow from the Actions tab, so they can be older than this page.',
        '',
        '- [Architecture maps: every app at five levels, interactive](https://owner.github.io/repo/)',
        '- [Blueprint coverage heatmap](https://owner.github.io/repo/reports/blueprint-coverage.html)',
        '- [Weak points](https://owner.github.io/repo/reports/weak-points.html)',
        '- [Working conditions](https://owner.github.io/repo/reports/working-conditions.html)',
        '',
      ].join('\n'),
    );
  });
});

describe('buildWiki', () => {
  const documents = [
    { path: 'README.md', content: '# borso.fr\n[arch](docs/architecture.md)' },
    { path: 'docs/architecture.md', content: '# Architecture' },
    { path: 'CLAUDE.md', content: '# Agents' },
    { path: 'docs/standards/naming.md', content: '# Naming' },
    { path: 'docs/standards/hotspots.md', content: '# Hotspots' },
    { path: 'docs/features/pragma/x/spec/spec.md', content: '# X spec' },
  ];

  it('writes every page, the indexes, the sidebar and the footer', () => {
    const pages = buildWiki(documents, SOURCE);
    const byName = new Map(pages.map((page) => [page.name, page.content]));
    expect(byName.get('Home')).toBe('# borso.fr\n[arch](architecture)');
    expect(byName.get('Knowledge')).toBe(
      '# Knowledge\n\nVendor surprises and reusable lessons. A hook prints the entry that applies.\n',
    );
    expect(byName.get('_Sidebar')).toBe(
      [
        '**[Home](Home)**',
        '',
        '**Start here**',
        '',
        '- [Architecture](architecture)',
        '- [Agent instructions](CLAUDE)',
        '',
        '**Browse**',
        '',
        '- [Apps](Apps)',
        '- [Code standards](Standards)',
        '- [Architecture decisions](Architecture-decisions)',
        '- [Root-cause analyses](Root-cause-analyses)',
        '- [Knowledge](Knowledge)',
        '- [Quality](Quality)',
        '- [Features](Features)',
        '- [Reports](Reports)',
        '',
      ].join('\n'),
    );
    expect(byName.has('features-pragma-x-spec-spec')).toBe(false);
    expect(byName.get('Standards')).toContain('- [Naming](standards-naming)');
    expect(byName.get('Standards')).not.toContain('Hotspots');
    expect(byName.get('standards-hotspots')).toBe('# Hotspots');
    expect(byName.get('Reports')).toContain('(standards-hotspots)');
    expect(byName.get('Features')).toContain(`[x](${TREE}/docs/features/pragma/x): X spec`);
    expect(byName.get('_Footer')).toContain(
      '[`abcdef012`](https://github.com/owner/repo/commit/abcdef0123456789)',
    );
  });

  it('refuses a page that would overwrite a generated index', () => {
    expect(() => buildWiki([{ path: 'docs/knowledge.md', content: '' }], SOURCE)).toThrow(
      'The page knowledge clashes with a generated index',
    );
  });
});
