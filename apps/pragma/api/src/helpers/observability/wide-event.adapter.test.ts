/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const spanRecorder = vi.hoisted(() => ({ recordAttributesOnActiveSpan: vi.fn() }));

vi.mock('./error-reporting.adapter', () => spanRecorder);

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
  vi.stubEnv('SENTRY_RELEASE', 'abc123');
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// @FollowsBlueprint test-node-adapter
describe('runInWideEvent', () => {
  it('writes one line holding the opening fields, the added ones and the outcome, then sets them on the span', async () => {
    const write = captureWrittenLines();
    const { addWideEventFields, runInWideEvent } = await importFreshAdapter();

    const answer = await runInWideEvent({ 'event.kind': 'scheduled' }, async () => {
      addWideEventFields({ 'push.failed_hosts': ['web.push.apple.com'] });
      await Promise.resolve();
      addWideEventFields({ 'push.failed_hosts': ['fcm.googleapis.com'] });
      return 'done';
    });

    const expectedEvent = {
      'service.name': 'pragma-api',
      'service.stage': 'preview',
      'service.version': 'abc123',
      'lambda.cold_start': true,
      'event.kind': 'scheduled',
      'push.failed_hosts': ['web.push.apple.com', 'fcm.googleapis.com'],
      outcome: 'success',
    };
    expect(answer).toBe('done');
    expect(readWrittenEvents(write)).toStrictEqual([expectedEvent]);
    expect(spanRecorder.recordAttributesOnActiveSpan).toHaveBeenCalledExactlyOnceWith(
      expectedEvent,
    );
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
    const failure = new RangeError('no streak');

    await expect(
      runInWideEvent({ 'event.kind': 'scheduled' }, () => Promise.reject(failure)),
    ).rejects.toBe(failure);

    expect(readWrittenEvents(write)).toMatchObject([
      { outcome: 'failed', 'error.type': 'RangeError', 'error.message': 'no streak' },
    ]);
  });

  it('records a thrown value that is not an error by its text', async () => {
    const write = captureWrittenLines();
    const { runInWideEvent } = await importFreshAdapter();

    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- this case is exactly the non-Error value describeThrownValue names NonErrorThrown
    await expect(runInWideEvent({}, () => Promise.reject('no streak'))).rejects.toBe('no streak');

    expect(readWrittenEvents(write)).toMatchObject([
      { outcome: 'failed', 'error.type': 'NonErrorThrown', 'error.message': 'no streak' },
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

  it('names the outer request as the parent of an event opened inside it, and emits each once', async () => {
    const write = captureWrittenLines();
    const { runInWideEvent } = await importFreshAdapter();

    await runInWideEvent({ 'request.id': 'batch' }, async () => {
      await runInWideEvent({ 'request.id': 'read' }, () => Promise.resolve());
    });

    expect(readWrittenEvents(write)).toMatchObject([
      { 'request.id': 'read', 'request.parent_id': 'batch' },
      { 'request.id': 'batch' },
    ]);
    expect(readWrittenEvents(write)[1]).not.toHaveProperty('request.parent_id');
  });
});

describe('addWideEventFields', () => {
  it('writes nothing for a field added outside any event', async () => {
    const write = captureWrittenLines();
    const { addWideEventFields } = await importFreshAdapter();

    addWideEventFields({ 'spotify.failure': ['TypeError'] });

    expect(write).not.toHaveBeenCalled();
    expect(spanRecorder.recordAttributesOnActiveSpan).not.toHaveBeenCalled();
  });

  it('writes nothing for a field added after its event left, so the request keeps one line', async () => {
    const write = captureWrittenLines();
    const { addWideEventFields, runInWideEvent } = await importFreshAdapter();
    let lateWork: Promise<void> = Promise.resolve();

    await runInWideEvent({ 'request.id': 'answered' }, () => {
      lateWork = new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      }).then(() => {
        addWideEventFields({ 'realtime.broadcast_failure': ['AggregateError'] });
      });
      return Promise.resolve();
    });
    await lateWork;

    const writtenEvents = readWrittenEvents(write);
    expect(writtenEvents).toMatchObject([{ 'request.id': 'answered', outcome: 'success' }]);
    expect(writtenEvents[0]).not.toHaveProperty('realtime.broadcast_failure');
    expect(spanRecorder.recordAttributesOnActiveSpan).toHaveBeenCalledOnce();
  });
});
