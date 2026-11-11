/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type WideEventAdapter = typeof import('./wide-event.adapter');

async function importFreshAdapter(): Promise<WideEventAdapter> {
  vi.resetModules();
  return await import('./wide-event.adapter');
}

function captureWrittenLines() {
  return vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
}

function readWrittenEvents(write: ReturnType<typeof captureWrittenLines>): unknown[] {
  return write.mock.calls.map(([line]) => {
    const parsedLine: unknown = JSON.parse(String(line));
    return parsedLine;
  });
}

beforeEach(() => {
  vi.stubEnv('STAGE', 'preview');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// @FollowsBlueprint test-node-adapter
describe('runInWideEvent', () => {
  it('writes one line holding the opening fields, the added ones and the outcome', async () => {
    const write = captureWrittenLines();
    const { addWideEventFields, runInWideEvent } = await importFreshAdapter();

    const answer = await runInWideEvent({ 'event.kind': 'scheduled' }, async () => {
      addWideEventFields({ 'job.failed_steps': ['first'] });
      await Promise.resolve();
      addWideEventFields({ 'job.failed_steps': ['second'] });
      return 'done';
    });

    expect(answer).toBe('done');
    expect(readWrittenEvents(write)).toStrictEqual([
      {
        'service.name': 'banana-rush-api',
        'service.stage': 'preview',
        'lambda.cold_start': true,
        'event.kind': 'scheduled',
        'job.failed_steps': ['first', 'second'],
        outcome: 'success',
      },
    ]);
  });

  it('leaves the stage out when the environment sets an empty one', async () => {
    vi.stubEnv('STAGE', '');
    const write = captureWrittenLines();
    const { runInWideEvent } = await importFreshAdapter();

    await runInWideEvent({}, () => Promise.resolve());

    expect(readWrittenEvents(write)[0]).not.toHaveProperty('service.stage');
  });

  it('marks only the first event of an instance as a cold start', async () => {
    const write = captureWrittenLines();
    const { runInWideEvent } = await importFreshAdapter();

    await runInWideEvent({}, () => Promise.resolve());
    await runInWideEvent({}, () => Promise.resolve());

    expect(readWrittenEvents(write)).toMatchObject([
      { 'lambda.cold_start': true },
      { 'lambda.cold_start': false },
    ]);
  });

  it('records the failure of work that threw and throws it on', async () => {
    const write = captureWrittenLines();
    const { runInWideEvent } = await importFreshAdapter();
    const failure = new RangeError('no row');

    await expect(
      runInWideEvent({ 'event.kind': 'scheduled' }, () => Promise.reject(failure)),
    ).rejects.toBe(failure);

    expect(readWrittenEvents(write)).toMatchObject([
      { outcome: 'failed', 'error.type': 'RangeError', 'error.message': 'no row' },
    ]);
  });

  it('records a thrown value that is not an error by its text', async () => {
    const write = captureWrittenLines();
    const { runInWideEvent } = await importFreshAdapter();

    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- this case is exactly the non-Error value describeThrownValue names NonErrorThrown
    await expect(runInWideEvent({}, () => Promise.reject('no row'))).rejects.toBe('no row');

    expect(readWrittenEvents(write)).toMatchObject([
      { outcome: 'failed', 'error.type': 'NonErrorThrown', 'error.message': 'no row' },
    ]);
  });

  it('keeps the outcome the work set rather than calling it a success', async () => {
    const write = captureWrittenLines();
    const { addWideEventFields, runInWideEvent } = await importFreshAdapter();

    await runInWideEvent({}, () => {
      addWideEventFields({ outcome: 'refused' });
      return Promise.resolve();
    });

    expect(readWrittenEvents(write)).toMatchObject([{ outcome: 'refused' }]);
  });
});

describe('addWideEventFields', () => {
  it('writes nothing for a field added outside any event', async () => {
    const write = captureWrittenLines();
    const { addWideEventFields } = await importFreshAdapter();

    addWideEventFields({ 'late.failure': 'TypeError' });

    expect(write).not.toHaveBeenCalled();
  });

  it('writes nothing for a field added after its event left, so the request keeps one line', async () => {
    const write = captureWrittenLines();
    const { addWideEventFields, runInWideEvent } = await importFreshAdapter();
    let lateWork: Promise<void> = Promise.resolve();

    await runInWideEvent({ 'request.id': 'answered' }, () => {
      lateWork = new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      }).then(() => {
        addWideEventFields({ 'late.failure': 'AggregateError' });
      });
      return Promise.resolve();
    });
    await lateWork;

    const writtenEvents = readWrittenEvents(write);
    expect(writtenEvents).toMatchObject([{ 'request.id': 'answered', outcome: 'success' }]);
    expect(writtenEvents[0]).not.toHaveProperty('late.failure');
  });
});
