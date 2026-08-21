import { describe, expect, it } from 'vitest';
import {
  buildSubjectBaseline,
  describeDetachedClaim,
  listDetachedClaims,
  parseSubjectBaseline,
  type MarkerClaim,
} from './subjects.core';

const RUNNER_REPOSITORY = 'apps/last-loop-lepin/api/src/runner/runner.repository.ts';
const EDITION_REPOSITORY = 'apps/last-loop-lepin/api/src/edition/edition.repository.ts';

function claim(overrides: Partial<MarkerClaim> = {}): MarkerClaim {
  return {
    filePath: RUNNER_REPOSITORY,
    blueprintId: 'repository-query',
    subject: 'listRunnersForEdition',
    ...overrides,
  };
}

const hasEveryDeclaration = (): boolean => true;
const hasNoDeclaration = (): boolean => false;

describe('buildSubjectBaseline', () => {
  it('records the blueprint each subject claims', () => {
    expect(buildSubjectBaseline([claim()])).toStrictEqual({
      [RUNNER_REPOSITORY]: { listRunnersForEdition: 'repository-query' },
    });
  });

  it('groups several markers in one file under that file', () => {
    const baseline = buildSubjectBaseline([
      claim({ subject: 'listRunnersForEdition' }),
      claim({ subject: 'countRunnersForEdition' }),
    ]);
    expect(baseline).toStrictEqual({
      [RUNNER_REPOSITORY]: {
        countRunnersForEdition: 'repository-query',
        listRunnersForEdition: 'repository-query',
      },
    });
  });

  it('sorts files and subjects so the recorded file reads as a stable diff', () => {
    const baseline = buildSubjectBaseline([
      claim({ filePath: RUNNER_REPOSITORY, subject: 'zeroRunners' }),
      claim({ filePath: EDITION_REPOSITORY, subject: 'listEditions' }),
      claim({ filePath: RUNNER_REPOSITORY, subject: 'allRunners' }),
    ]);
    expect(Object.keys(baseline)).toStrictEqual([EDITION_REPOSITORY, RUNNER_REPOSITORY]);
    expect(Object.keys(baseline[RUNNER_REPOSITORY] ?? {})).toStrictEqual([
      'allRunners',
      'zeroRunners',
    ]);
  });

  it('sorts files and subjects that arrive already in order', () => {
    const baseline = buildSubjectBaseline([
      claim({ filePath: EDITION_REPOSITORY, subject: 'allEditions' }),
      claim({ filePath: RUNNER_REPOSITORY, subject: 'allRunners' }),
      claim({ filePath: RUNNER_REPOSITORY, subject: 'zeroRunners' }),
    ]);
    expect(Object.keys(baseline)).toStrictEqual([EDITION_REPOSITORY, RUNNER_REPOSITORY]);
    expect(Object.keys(baseline[RUNNER_REPOSITORY] ?? {})).toStrictEqual([
      'allRunners',
      'zeroRunners',
    ]);
  });

  it('records no file for an empty claim set', () => {
    expect(buildSubjectBaseline([])).toStrictEqual({});
  });
});

describe('parseSubjectBaseline', () => {
  it('reads back what it wrote', () => {
    const baseline = buildSubjectBaseline([claim()]);
    expect(parseSubjectBaseline(JSON.stringify(baseline))).toStrictEqual(baseline);
  });

  it.each([
    ['[]', 'an array is not a mapping of files'],
    ['null', 'null is not a mapping of files'],
    ['"a string"', 'a string is not a mapping of files'],
  ])('refuses %s, because %s', (raw) => {
    expect(parseSubjectBaseline(raw)).toBeUndefined();
  });

  it.each([
    ['{"a.ts": []}', 'a file maps subjects, not a list'],
    ['{"a.ts": null}', 'a file maps subjects, not null'],
    ['{"a.ts": "repository-query"}', 'a file maps subjects, not one id'],
  ])('refuses %s, because %s', (raw) => {
    expect(parseSubjectBaseline(raw)).toBeUndefined();
  });

  it('refuses a subject whose blueprint id is not a string', () => {
    expect(parseSubjectBaseline('{"a.ts": {"listRunners": 7}}')).toBeUndefined();
  });
});

describe('listDetachedClaims', () => {
  it('reports a marker that moved onto a declaration inserted under it', () => {
    const recorded = buildSubjectBaseline([claim()]);
    const afterTheInsertion = [claim({ subject: 'deleteAllEditionRunners' })];

    expect(listDetachedClaims(recorded, afterTheInsertion, hasEveryDeclaration)).toStrictEqual([
      {
        filePath: RUNNER_REPOSITORY,
        blueprintId: 'repository-query',
        subject: 'listRunnersForEdition',
      },
    ]);
  });

  it('reports nothing when every marker still names its subject', () => {
    const recorded = buildSubjectBaseline([claim()]);
    expect(listDetachedClaims(recorded, [claim()], hasEveryDeclaration)).toStrictEqual([]);
  });

  it('reports nothing when a marker is added, which claims no earlier subject', () => {
    const recorded = buildSubjectBaseline([claim()]);
    const withOneMore = [claim(), claim({ subject: 'countRunnersForEdition' })];
    expect(listDetachedClaims(recorded, withOneMore, hasEveryDeclaration)).toStrictEqual([]);
  });

  it('reports nothing when the subject was deleted or renamed rather than unclaimed', () => {
    const recorded = buildSubjectBaseline([claim()]);
    const afterTheRename = [claim({ subject: 'listEditionRunners' })];
    expect(listDetachedClaims(recorded, afterTheRename, hasNoDeclaration)).toStrictEqual([]);
  });

  it('reports nothing when the whole file is gone', () => {
    const recorded = buildSubjectBaseline([claim()]);
    expect(listDetachedClaims(recorded, [], hasEveryDeclaration)).toStrictEqual([]);
  });

  it('reports a subject whose marker now names a different blueprint', () => {
    const recorded = buildSubjectBaseline([claim()]);
    const afterTheSwap = [claim({ blueprintId: 'repository-row-mapper' })];
    expect(listDetachedClaims(recorded, afterTheSwap, hasEveryDeclaration)).toStrictEqual([
      {
        filePath: RUNNER_REPOSITORY,
        blueprintId: 'repository-query',
        subject: 'listRunnersForEdition',
      },
    ]);
  });

  it('asks whether the file still declares the subject it lost', () => {
    const asked: string[] = [];
    listDetachedClaims(
      buildSubjectBaseline([claim()]),
      [claim({ subject: 'other' })],
      (filePath, subject) => {
        asked.push(`${filePath}:${subject}`);
        return false;
      },
    );
    expect(asked).toStrictEqual([`${RUNNER_REPOSITORY}:listRunnersForEdition`]);
  });
});

describe('describeDetachedClaim', () => {
  it('names the file, the blueprint and the symbol the marker left behind', () => {
    const message = describeDetachedClaim({
      filePath: RUNNER_REPOSITORY,
      blueprintId: 'repository-query',
      subject: 'listRunnersForEdition',
    });
    expect(message).toContain(RUNNER_REPOSITORY);
    expect(message).toContain('@FollowsBlueprint repository-query');
    expect(message).toContain('listRunnersForEdition');
    expect(message).toContain('--accept');
  });
});
