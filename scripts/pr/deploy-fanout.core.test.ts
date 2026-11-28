import { describe, expect, it } from 'vitest';

import {
  decideDeployCandidates,
  describeDeployFanout,
  keepChangedOutput,
} from './deploy-fanout.core';

const SLUGS = ['pragma', 'banana-rush', 'talos', 'borso-fr'];
const EVERY_APPLICATION = ['banana-rush', 'borso-fr', 'pragma', 'talos'];

describe('decideDeployCandidates', () => {
  it.each([
    'infra/cdk/src/constructs/dsql-schema.ts',
    'pnpm-workspace.yaml',
    'pnpm-lock.yaml',
    'package.json',
    'apps/pragma/package.json',
    'infra/cdk/package.json',
  ])('makes every application, sorted, a candidate when %s changed', (changedPath) => {
    const fanout = decideDeployCandidates([changedPath], SLUGS);

    expect(fanout.applications).toEqual(EVERY_APPLICATION);
    expect(fanout.reason).toContain('every application is a candidate');
  });

  it('makes every application a candidate when a shared input moved beside documentation', () => {
    expect(decideDeployCandidates(['docs/x.md', 'pnpm-lock.yaml'], SLUGS).applications).toEqual(
      EVERY_APPLICATION,
    );
  });

  it('names only the applications whose own paths changed', () => {
    const fanout = decideDeployCandidates(
      ['apps/pragma/api/src/song/song.service.ts', 'apps/talos/site/src/main.tsx'],
      SLUGS,
    );

    expect(fanout.applications).toEqual(['pragma', 'talos']);
    expect(fanout.reason).toContain('only these applications have changed paths.');
    expect(fanout.reason).toContain('synthesizes each candidate');
  });

  it('does not treat a nested package.json as a shared input', () => {
    expect(decideDeployCandidates(['apps/pragma/api/package.json'], SLUGS).applications).toEqual([
      'pragma',
    ]);
  });

  it('does not take a prefix of a slug for the slug itself', () => {
    const fanout = decideDeployCandidates(['apps/pragma-extra/site/src/main.tsx'], SLUGS);

    expect(fanout.applications).toEqual([]);
    expect(fanout.reason).toBe('no application path changed.');
  });

  it('names nothing when the diff touches neither applications nor shared inputs', () => {
    expect(
      decideDeployCandidates(['docs/adr/2026-10-25T0054-read-only.md'], SLUGS).applications,
    ).toEqual([]);
  });

  it('leaves the caller list untouched', () => {
    const slugs = ['pragma', 'banana-rush'];
    decideDeployCandidates(['infra/cdk/src/index.ts'], slugs);

    expect(slugs).toEqual(['pragma', 'banana-rush']);
  });
});

describe('keepChangedOutput', () => {
  const candidates = decideDeployCandidates(['pnpm-lock.yaml'], SLUGS);

  it('keeps the candidates whose synthesized output differs', () => {
    const fanout = keepChangedOutput(candidates, ['talos', 'pragma', 'skull-king']);

    expect(fanout.applications).toEqual(['pragma', 'talos']);
    expect(fanout.reason).toBe('their synthesized templates or assets differ from the base.');
  });

  it('keeps none when every candidate synthesizes what the base synthesizes', () => {
    const fanout = keepChangedOutput(candidates, []);

    expect(fanout.applications).toEqual([]);
    expect(fanout.reason).toBe('every candidate synthesizes exactly what the base synthesizes.');
  });
});

describe('describeDeployFanout', () => {
  it('joins the applications before the reason', () => {
    expect(
      describeDeployFanout(
        keepChangedOutput(decideDeployCandidates(['package.json'], SLUGS), ['talos', 'pragma']),
      ),
    ).toBe('pragma, talos — their synthesized templates or assets differ from the base.');
  });

  it('says none when no application deploys', () => {
    expect(describeDeployFanout(decideDeployCandidates(['README.md'], SLUGS))).toBe(
      'none — no application path changed.',
    );
  });
});
