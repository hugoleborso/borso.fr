import { describe, expect, it } from 'vitest';
import {
  classifyIndexBuildJob,
  describeFailedIndexBuild,
  describeInvalidIndex,
  describeMissingIndex,
  describeUnfinishedIndexBuild,
  hasWaitLimitPassed,
  planIndexBuildStep,
  readCreatedIndexName,
  selectSubmittedJobIds,
} from './index-build-jobs.utils.js';

// @FollowsBlueprint test-pure-unit
describe('selectSubmittedJobIds', () => {
  it('reads the job id DSQL returns for an asynchronous index', () => {
    expect(selectSubmittedJobIds([{ job_id: 'jh2gbtx4mzhgfkbimtgwn5j45y' }])).toStrictEqual([
      'jh2gbtx4mzhgfkbimtgwn5j45y',
    ]);
  });

  it('keeps nothing from a statement that returned no job', () => {
    expect(selectSubmittedJobIds([])).toStrictEqual([]);
  });

  it.each([[{ job_id: 7 }], [{ job_id: '' }], [{ job_id: null }], [{ other: 'x' }]])(
    'ignores %j, which carries no job id',
    (row) => {
      expect(selectSubmittedJobIds([row])).toStrictEqual([]);
    },
  );
});

describe('readCreatedIndexName', () => {
  it('reads a quoted name after ASYNC IF NOT EXISTS', () => {
    expect(
      readCreatedIndexName(
        'CREATE UNIQUE INDEX ASYNC IF NOT EXISTS "song_deezer_track_id_idx" ON "song" ("deezer_track_id")',
      ),
    ).toBe('song_deezer_track_id_idx');
  });

  it('folds an unquoted name to lower case, as Postgres does', () => {
    expect(readCreatedIndexName('CREATE INDEX ASYNC Take_Song_Idx ON take (song_id)')).toBe(
      'take_song_idx',
    );
  });

  it('keeps the case and the doubled quotes of a quoted name', () => {
    expect(readCreatedIndexName('create index async "Odd""Name" on t (c)')).toBe('Odd"Name');
  });

  it.each([
    ['CREATE TABLE IF NOT EXISTS song (id TEXT)'],
    ['CREATE INDEX foo_idx ON foo (col)'],
    ['DROP INDEX song_deezer_track_id_idx'],
  ])('reads no index from %s', (statement) => {
    expect(readCreatedIndexName(statement)).toBeNull();
  });
});

describe('classifyIndexBuildJob', () => {
  it.each([['submitted'], ['processing']])('reads %s as still running', (status) => {
    expect(classifyIndexBuildJob([{ status, details: null }])).toStrictEqual({ kind: 'running' });
  });

  it('reads completed as completed', () => {
    expect(classifyIndexBuildJob([{ status: 'completed', details: null }])).toStrictEqual({
      kind: 'completed',
    });
  });

  it('carries the reason of a failed build', () => {
    expect(
      classifyIndexBuildJob([
        { status: 'failed', details: 'Found duplicate key while validating index for UCVs' },
      ]),
    ).toStrictEqual({
      kind: 'failed',
      details: 'Found duplicate key while validating index for UCVs',
    });
  });

  it('says so when a failed build carries no reason', () => {
    expect(classifyIndexBuildJob([{ status: 'failed', details: null }])).toStrictEqual({
      kind: 'failed',
      details: 'sys.jobs gave no details',
    });
  });

  it('reads a job sys.jobs no longer holds as untracked', () => {
    expect(classifyIndexBuildJob([])).toStrictEqual({ kind: 'untracked' });
  });

  it('reads a status the documentation does not list as untracked', () => {
    expect(classifyIndexBuildJob([{ status: 'cancelled', details: null }])).toStrictEqual({
      kind: 'untracked',
    });
  });
});

describe('hasWaitLimitPassed', () => {
  it('reads a moment before the deadline as within the limit', () => {
    expect(hasWaitLimitPassed(999, 1000)).toBe(false);
  });

  it('reads the deadline itself as past the limit', () => {
    expect(hasWaitLimitPassed(1000, 1000)).toBe(true);
  });
});

describe('planIndexBuildStep', () => {
  const within = {
    isPastWaitLimit: false,
    indexName: 'song_idx',
    jobId: 'job-1',
    waitLimitSeconds: 240,
  };

  it('settles on a completed build', () => {
    expect(planIndexBuildStep({ ...within, progress: { kind: 'completed' } })).toStrictEqual({
      failure: null,
      isSettled: true,
      needsIndexCheck: false,
    });
  });

  it('asks for the index itself when sys.jobs no longer holds the job', () => {
    expect(planIndexBuildStep({ ...within, progress: { kind: 'untracked' } })).toStrictEqual({
      failure: null,
      isSettled: false,
      needsIndexCheck: true,
    });
  });

  it('fails on a failed build, even past the wait limit', () => {
    expect(
      planIndexBuildStep({
        ...within,
        isPastWaitLimit: true,
        progress: { kind: 'failed', details: 'duplicate key' },
      }),
    ).toStrictEqual({
      failure: describeFailedIndexBuild('song_idx', 'job-1', 'duplicate key'),
      isSettled: false,
      needsIndexCheck: false,
    });
  });

  it('polls again while a build runs within the limit', () => {
    expect(planIndexBuildStep({ ...within, progress: { kind: 'running' } })).toStrictEqual({
      failure: null,
      isSettled: false,
      needsIndexCheck: false,
    });
  });

  it('fails a build still running at the limit', () => {
    expect(
      planIndexBuildStep({ ...within, isPastWaitLimit: true, progress: { kind: 'running' } }),
    ).toStrictEqual({
      failure: describeUnfinishedIndexBuild('song_idx', 'job-1', 240),
      isSettled: false,
      needsIndexCheck: false,
    });
  });
});

describe('the failure messages', () => {
  it('names the index, the job and the reason of a failed build, and the way out', () => {
    expect(describeFailedIndexBuild('song_idx', 'job-1', 'duplicate key')).toBe(
      'The build of index "song_idx" failed (sys.jobs job-1): duplicate key. ' +
        'DSQL keeps the index INVALID, and a unique one still refuses writes that break it. ' +
        'Fix the rows that break it, DROP INDEX "song_idx", then deploy again.',
    );
  });

  it('names how long it waited for an unfinished build', () => {
    expect(describeUnfinishedIndexBuild('song_idx', 'job-1', 240)).toBe(
      'The build of index "song_idx" (sys.jobs job-1) had not finished after 240 s, ' +
        'so the migration is not recorded as applied. ' +
        'Deploy again once sys.jobs shows it completed or failed.',
    );
  });

  it('names an invalid index and the way out', () => {
    expect(describeInvalidIndex('song_idx')).toBe(
      'Index "song_idx" exists but is INVALID, which is what DSQL leaves after a failed build. ' +
        'Fix the rows that break it, DROP INDEX "song_idx", then deploy again.',
    );
  });

  it('names a missing index', () => {
    expect(describeMissingIndex('song_idx')).toBe(
      'The migration asked for index "song_idx", DSQL returned no build job for it, ' +
        'and no index of that name exists.',
    );
  });
});
