import { describe, expect, it } from 'vitest';
import {
  hasOnlyCheckScriptChanges,
  isCheckOnlyChange,
  isCheckOnlyScript,
  manifestPathOf,
} from './check-only-change.core';

const MANIFEST = {
  name: '@borso-app/pragma',
  scripts: { build: 'vite build', deploy: 'cdk deploy', lint: 'eslint .' },
  dependencies: { react: 'catalog:' },
};

describe('isCheckOnlyScript', () => {
  it('names the scripts a deploy never runs', () => {
    expect(isCheckOnlyScript('lint')).toBe(true);
    expect(isCheckOnlyScript('typecheck')).toBe(true);
    expect(isCheckOnlyScript('test')).toBe(true);
    expect(isCheckOnlyScript('dev')).toBe(true);
    expect(isCheckOnlyScript('test:mutation')).toBe(true);
    expect(isCheckOnlyScript('dev:api')).toBe(true);
    expect(isCheckOnlyScript('db:local:start')).toBe(true);
  });

  it('keeps every other script, since a deploy may run it', () => {
    expect(isCheckOnlyScript('build')).toBe(false);
    expect(isCheckOnlyScript('deploy')).toBe(false);
    expect(isCheckOnlyScript('db:generate')).toBe(false);
    expect(isCheckOnlyScript('linter')).toBe(false);
  });
});

describe('hasOnlyCheckScriptChanges', () => {
  it('ignores a rewritten lint script', () => {
    const after = { ...MANIFEST, scripts: { ...MANIFEST.scripts, lint: '../../lint.sh' } };
    expect(hasOnlyCheckScriptChanges(MANIFEST, after)).toBe(true);
  });

  it('ignores an added or removed check-only script', () => {
    const after = { ...MANIFEST, scripts: { build: 'vite build', deploy: 'cdk deploy' } };
    expect(hasOnlyCheckScriptChanges(MANIFEST, after)).toBe(true);
  });

  it('ignores key order', () => {
    const reordered = {
      dependencies: { react: 'catalog:' },
      scripts: { lint: 'eslint .', deploy: 'cdk deploy', build: 'vite build' },
      name: '@borso-app/pragma',
    };
    expect(hasOnlyCheckScriptChanges(MANIFEST, reordered)).toBe(true);
  });

  it('ignores key order inside the objects of an array', () => {
    expect(
      hasOnlyCheckScriptChanges(
        { name: 'a', exports: [{ types: 't', import: 'i' }] },
        { name: 'a', exports: [{ import: 'i', types: 't' }] },
      ),
    ).toBe(true);
  });

  it('counts a changed build script', () => {
    const after = { ...MANIFEST, scripts: { ...MANIFEST.scripts, build: 'vite build --mode x' } };
    expect(hasOnlyCheckScriptChanges(MANIFEST, after)).toBe(false);
  });

  it('counts a change outside the scripts', () => {
    const after = { ...MANIFEST, borso: { previews: false } };
    expect(hasOnlyCheckScriptChanges(MANIFEST, after)).toBe(false);
  });

  it('compares manifests without scripts on their other fields', () => {
    expect(
      hasOnlyCheckScriptChanges({ name: 'a', files: ['x'] }, { name: 'a', files: ['x'] }),
    ).toBe(true);
    expect(hasOnlyCheckScriptChanges({ name: 'a' }, { name: 'b' })).toBe(false);
  });

  it('refuses anything that is not a manifest object', () => {
    expect(hasOnlyCheckScriptChanges(null, MANIFEST)).toBe(false);
    expect(hasOnlyCheckScriptChanges(MANIFEST, [])).toBe(false);
  });
});

describe('isCheckOnlyChange', () => {
  const directory = 'apps/pragma';
  const lintOnly = {
    before: MANIFEST,
    after: { ...MANIFEST, scripts: { ...MANIFEST.scripts, lint: '../../lint.sh' } },
  };

  it('names the manifest of a directory', () => {
    expect(manifestPathOf(directory)).toBe('apps/pragma/package.json');
  });

  it('is true when only the manifest moved, and only in check scripts', () => {
    expect(isCheckOnlyChange(directory, ['apps/pragma/package.json'], lintOnly)).toBe(true);
  });

  it('is false when another file in the directory moved too', () => {
    expect(
      isCheckOnlyChange(directory, ['apps/pragma/package.json', 'apps/pragma/site/a.ts'], lintOnly),
    ).toBe(false);
  });

  it('is false when the manifest change reaches a deployed field', () => {
    const build = {
      before: MANIFEST,
      after: { ...MANIFEST, scripts: { ...MANIFEST.scripts, build: 'tsc' } },
    };
    expect(isCheckOnlyChange(directory, ['apps/pragma/package.json'], build)).toBe(false);
  });

  it('is false when nothing is known to have changed', () => {
    expect(isCheckOnlyChange(directory, [], lintOnly)).toBe(false);
  });
});
