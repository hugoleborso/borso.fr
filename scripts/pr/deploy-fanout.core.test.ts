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
      ['docs/adr/0044-read-only-production-database-access.md'],
      SLUGS,
    );

    expect(fanout.applications).toEqual([]);
    expect(fanout.everyApplication).toBe(false);
    expect(fanout.dependencyManifestMoved).toBe(false);
    expect(fanout.reason).toBe('no application path changed.');
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
