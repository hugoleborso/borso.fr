import { describe, expect, it } from 'vitest';
import { listDuplicatedResolutions } from './single-resolution.core';

const NAMES = ['@smithy/core', '@aws-sdk/core'];

function lockfileOf(...keys: string[]): string {
  return ['packages:', '', ...keys.map((key) => `  ${key}:`), ''].join('\n');
}

describe('listDuplicatedResolutions', () => {
  it('finds nothing when each watched package resolves to one version', () => {
    const lockfile = lockfileOf("'@smithy/core@3.36.0'", "'@aws-sdk/core@3.978.3'");

    expect(listDuplicatedResolutions(lockfile, NAMES)).toEqual([]);
  });

  it('names the package and every version it resolves to, in order', () => {
    const lockfile = lockfileOf(
      "'@smithy/core@3.36.0'",
      "'@smithy/core@3.33.3'",
      "'@aws-sdk/core@3.978.3'",
    );

    expect(listDuplicatedResolutions(lockfile, NAMES)).toEqual([
      { name: '@smithy/core', versions: ['3.33.3', '3.36.0'] },
    ]);
  });

  it('counts a version once when a snapshot repeats it with its peers', () => {
    const lockfile = lockfileOf("'@smithy/core@3.36.0'", "'@smithy/core@3.36.0(typescript@7.0.2)'");

    expect(listDuplicatedResolutions(lockfile, NAMES)).toEqual([]);
  });

  it('counts a version once when its snapshot is written on the same line as an empty object', () => {
    const lockfile = [
      'packages:',
      "  '@smithy/core@3.36.0':",
      'snapshots:',
      "  '@smithy/core@3.36.0': {}",
      '',
    ].join('\n');

    expect(listDuplicatedResolutions(lockfile, NAMES)).toEqual([]);
  });

  it('reads a key that nothing closes', () => {
    const lockfile = ['packages:', '  postgres@3.4.9', '  postgres@3.4.8', ''].join('\n');

    expect(listDuplicatedResolutions(lockfile, ['postgres'])).toEqual([
      { name: 'postgres', versions: ['3.4.8', '3.4.9'] },
    ]);
  });

  it('reads an unscoped and unquoted key too', () => {
    const lockfile = lockfileOf('postgres@3.4.9', 'postgres@3.4.8');

    expect(listDuplicatedResolutions(lockfile, ['postgres'])).toEqual([
      { name: 'postgres', versions: ['3.4.8', '3.4.9'] },
    ]);
  });

  it('leaves alone a package nobody asked it to watch', () => {
    const lockfile = lockfileOf("'zod@4.1.0'", "'zod@3.25.0'");

    expect(listDuplicatedResolutions(lockfile, NAMES)).toEqual([]);
  });

  it('does not take a package whose name only starts like a watched one', () => {
    const lockfile = lockfileOf("'@smithy/core-extra@1.0.0'", "'@smithy/core-extra@2.0.0'");

    expect(listDuplicatedResolutions(lockfile, NAMES)).toEqual([]);
  });

  it('ignores a dependency line nested under an importer', () => {
    const lockfile = ['importers:', '  .:', "      '@smithy/core@3.33.3':", ''].join('\n');

    expect(
      listDuplicatedResolutions(`${lockfile}${lockfileOf("'@smithy/core@3.36.0'")}`, NAMES),
    ).toEqual([]);
  });
});
