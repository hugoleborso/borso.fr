import { describe, expect, it } from 'vitest';

import { decideDeployFanout, describeDeployFanout } from './deploy-fanout.core';

const SLUGS = ['pragma', 'banana-rush', 'talos', 'borso-fr'];

describe('decideDeployFanout', () => {
  it('fans out to every application, sorted, when a construct changed', () => {
    const fanout = decideDeployFanout(['infra/cdk/src/constructs/dsql-schema.ts'], SLUGS);

    expect(fanout.everyApplication).toBe(true);
    expect(fanout.applications).toEqual(['banana-rush', 'borso-fr', 'pragma', 'talos']);
    expect(fanout.reason).toContain('the constructs are the contract');
  });

  it('reports the dependency manifest alongside a construct change', () => {
    const fanout = decideDeployFanout(['infra/cdk/src/index.ts', 'package.json'], SLUGS);

    expect(fanout.everyApplication).toBe(true);
    expect(fanout.dependencyManifestMoved).toBe(true);
  });

  it('names only the applications whose own paths changed', () => {
    const fanout = decideDeployFanout(
      ['apps/pragma/api/src/song/song.service.ts', 'apps/talos/site/src/main.tsx'],
      SLUGS,
    );

    expect(fanout.everyApplication).toBe(false);
    expect(fanout.applications).toEqual(['pragma', 'talos']);
    expect(fanout.dependencyManifestMoved).toBe(false);
    expect(fanout.reason).toBe('only these applications have changed paths.');
  });

  it('does not take a prefix of a slug for the slug itself', () => {
    const fanout = decideDeployFanout(['apps/pragma-extra/site/src/main.tsx'], SLUGS);

    expect(fanout.applications).toEqual([]);
    expect(fanout.reason).toBe('no application path changed.');
  });

  it('adds the dependency narrowing note when a workspace manifest moved', () => {
    const fanout = decideDeployFanout(['pnpm-lock.yaml'], SLUGS);

    expect(fanout.applications).toEqual([]);
    expect(fanout.dependencyManifestMoved).toBe(true);
    expect(fanout.reason).toContain('no application path changed.');
    expect(fanout.reason).toContain('apps-with-changed-dependencies.ts');
  });

  it.each([
    'pnpm-workspace.yaml',
    'package.json',
    'apps/pragma/package.json',
    'infra/cdk/package.json',
  ])('treats %s as a dependency manifest', (changedPath) => {
    expect(decideDeployFanout([changedPath], SLUGS).dependencyManifestMoved).toBe(true);
  });

  it('does not treat a nested package.json as a workspace manifest', () => {
    expect(
      decideDeployFanout(['apps/pragma/api/package.json'], SLUGS).dependencyManifestMoved,
    ).toBe(false);
  });

  it('deploys nothing when the diff touches neither applications nor shared inputs', () => {
    const fanout = decideDeployFanout(
      ['docs/adr/2026-10-25T0054-read-only-production-database-access.md'],
      SLUGS,
    );

    expect(fanout.applications).toEqual([]);
    expect(fanout.everyApplication).toBe(false);
    expect(fanout.dependencyManifestMoved).toBe(false);
    expect(fanout.reason).toBe('no application path changed.');
  });

  it('drops an application whose every change deploy.yml calls tooling', () => {
    const asked: string[] = [];
    const fanout = decideDeployFanout(
      ['apps/pragma/README.md', 'apps/talos/site/src/main.tsx', 'docs/x.md'],
      SLUGS,
      (directory, changedFiles) => {
        asked.push(`${directory}:${changedFiles.join(',')}`);
        return directory === 'apps/pragma';
      },
    );

    expect(fanout.applications).toEqual(['talos']);
    expect(asked).toEqual([
      'infra/cdk:',
      'apps/banana-rush:',
      'apps/borso-fr:',
      'apps/pragma:apps/pragma/README.md',
      'apps/talos:apps/talos/site/src/main.tsx',
    ]);
  });

  it('does not fan out for a construct change deploy.yml calls tooling', () => {
    const fanout = decideDeployFanout(
      ['infra/cdk/README.md'],
      SLUGS,
      (directory) => directory === 'infra/cdk',
    );

    expect(fanout.everyApplication).toBe(false);
    expect(fanout.applications).toEqual([]);
  });

  it('still reports a dependency manifest whose application it dropped', () => {
    const fanout = decideDeployFanout(['apps/pragma/package.json'], SLUGS, () => true);

    expect(fanout.applications).toEqual([]);
    expect(fanout.dependencyManifestMoved).toBe(true);
  });

  it('leaves the caller list untouched', () => {
    const slugs = ['pragma', 'banana-rush'];
    decideDeployFanout(['infra/cdk/src/index.ts'], slugs);

    expect(slugs).toEqual(['pragma', 'banana-rush']);
  });
});

describe('describeDeployFanout', () => {
  it('joins the applications before the reason', () => {
    expect(
      describeDeployFanout(
        decideDeployFanout(['apps/pragma/site/src/x.ts', 'apps/talos/site/src/y.ts'], SLUGS),
      ),
    ).toBe('pragma, talos — only these applications have changed paths.');
  });

  it('says none when no application deploys', () => {
    expect(describeDeployFanout(decideDeployFanout(['README.md'], SLUGS))).toBe(
      'none — no application path changed.',
    );
  });
});
