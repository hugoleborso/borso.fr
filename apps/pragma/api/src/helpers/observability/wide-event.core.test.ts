import { describe, expect, it } from 'vitest';
import {
  buildDetachedFields,
  buildFailureFields,
  buildHttpEndingFields,
  buildOpeningFields,
  buildReturnedFields,
  buildServiceFields,
  describeThrownValue,
  mergeWideEventFields,
  selectLambdaRequestId,
  selectRequestId,
  selectRequestOutcome,
  serializeWideEvent,
} from './wide-event.core';

const SERVICE = { stage: 'prod', version: 'abc123' };
const ANONYMOUS_SERVICE = { stage: undefined, version: undefined };
const REQUEST_ID = '6f1c5b9e-0000-4000-8000-000000000001';

function buildNamedFailure(): Error {
  const failure = new TypeError('cannot read the song');
  failure.stack = 'TypeError: cannot read the song\n    at songs.service.ts:12';
  return failure;
}

// @FollowsBlueprint test-pure-unit
describe('selectRequestOutcome', () => {
  it.each([
    [200, 'success'],
    [399, 'success'],
    [400, 'refused'],
    [499, 'refused'],
    [500, 'failed'],
    [503, 'failed'],
  ])('answers status %i as %s', (status, outcome) => {
    expect(selectRequestOutcome(status)).toBe(outcome);
  });
});

describe('describeThrownValue', () => {
  it('names an error after its class and keeps its message and stack', () => {
    expect(describeThrownValue(buildNamedFailure())).toEqual({
      type: 'TypeError',
      message: 'cannot read the song',
      stack: 'TypeError: cannot read the song\n    at songs.service.ts:12',
    });
  });

  it('describes a thrown value that is not an error by its text, with no stack', () => {
    expect(describeThrownValue('plain refusal')).toEqual({
      type: 'NonErrorThrown',
      message: 'plain refusal',
      stack: undefined,
    });
  });
});

describe('buildFailureFields', () => {
  it('marks the event failed and carries the error type, message and stack', () => {
    expect(buildFailureFields(buildNamedFailure())).toEqual({
      outcome: 'failed',
      'error.type': 'TypeError',
      'error.message': 'cannot read the song',
      'error.stack': 'TypeError: cannot read the song\n    at songs.service.ts:12',
    });
  });

  it('leaves the stack out when the thrown value has none', () => {
    expect(buildFailureFields(42)).toStrictEqual({
      outcome: 'failed',
      'error.type': 'NonErrorThrown',
      'error.message': '42',
    });
  });
});

describe('buildServiceFields', () => {
  it('names the service, its stage and its release', () => {
    expect(buildServiceFields(SERVICE)).toEqual({
      'service.name': 'pragma-api',
      'service.stage': 'prod',
      'service.version': 'abc123',
    });
  });

  it('leaves out a stage and a release the environment does not set', () => {
    expect(buildServiceFields(ANONYMOUS_SERVICE)).toStrictEqual({ 'service.name': 'pragma-api' });
  });
});

describe('buildOpeningFields', () => {
  it('opens the first event of an instance with the service and the base fields', () => {
    expect(
      buildOpeningFields(
        { service: SERVICE, isColdStart: true, parentRequestId: undefined },
        { 'event.kind': 'http', 'request.id': REQUEST_ID, 'trace.id': undefined },
      ),
    ).toStrictEqual({
      'service.name': 'pragma-api',
      'service.stage': 'prod',
      'service.version': 'abc123',
      'lambda.cold_start': true,
      'event.kind': 'http',
      'request.id': REQUEST_ID,
    });
  });

  it('names the outer request as the parent of an event opened inside it', () => {
    expect(
      buildOpeningFields(
        { service: ANONYMOUS_SERVICE, isColdStart: false, parentRequestId: 'batch-id' },
        { 'request.id': REQUEST_ID },
      ),
    ).toStrictEqual({
      'service.name': 'pragma-api',
      'lambda.cold_start': false,
      'request.parent_id': 'batch-id',
      'request.id': REQUEST_ID,
    });
  });
});

describe('buildHttpEndingFields', () => {
  it('records the route, status and duration of a successful request', () => {
    expect(
      buildHttpEndingFields({
        route: '/api/songs/:songId',
        status: 200,
        durationMilliseconds: 12,
        failure: undefined,
      }),
    ).toStrictEqual({
      'http.route': '/api/songs/:songId',
      'http.response.status_code': 200,
      duration_ms: 12,
      outcome: 'success',
    });
  });

  it('records a refusal without the error that carried it', () => {
    expect(
      buildHttpEndingFields({
        route: '/api/songs',
        status: 404,
        durationMilliseconds: 3,
        failure: buildNamedFailure(),
      }),
    ).toStrictEqual({
      'http.route': '/api/songs',
      'http.response.status_code': 404,
      duration_ms: 3,
      outcome: 'refused',
    });
  });

  it('records the error that became a 500', () => {
    expect(
      buildHttpEndingFields({
        route: '/api/songs',
        status: 500,
        durationMilliseconds: 7,
        failure: buildNamedFailure(),
      }),
    ).toStrictEqual({
      'http.route': '/api/songs',
      'http.response.status_code': 500,
      duration_ms: 7,
      outcome: 'failed',
      'error.type': 'TypeError',
      'error.message': 'cannot read the song',
      'error.stack': 'TypeError: cannot read the song\n    at songs.service.ts:12',
    });
  });

  it('records a 500 that no thrown error explains as failed, with no error fields', () => {
    expect(
      buildHttpEndingFields({
        route: '/api/songs',
        status: 502,
        durationMilliseconds: 7,
        failure: undefined,
      }),
    ).toStrictEqual({
      'http.route': '/api/songs',
      'http.response.status_code': 502,
      duration_ms: 7,
      outcome: 'failed',
    });
  });
});

describe('buildReturnedFields', () => {
  it('keeps an outcome the work already set', () => {
    expect(buildReturnedFields({ outcome: 'refused' })).toStrictEqual({});
  });

  it('marks work that returned with no outcome as a success', () => {
    expect(buildReturnedFields({ 'event.kind': 'scheduled' })).toStrictEqual({
      outcome: 'success',
    });
  });
});

describe('mergeWideEventFields', () => {
  it('appends a repeated list fact to the list already held, so no failure is lost', () => {
    expect(
      mergeWideEventFields(
        { 'push.failed_hosts': ['web.push.apple.com'], 'member.id': 'member-1' },
        { 'push.failed_hosts': ['fcm.googleapis.com'] },
      ),
    ).toStrictEqual({
      'push.failed_hosts': ['web.push.apple.com', 'fcm.googleapis.com'],
      'member.id': 'member-1',
    });
  });

  it('replaces a single value with the newer one', () => {
    expect(
      mergeWideEventFields({ outcome: 'success' }, { outcome: 'failed', 'free_slots.slots': 4 }),
    ).toStrictEqual({ outcome: 'failed', 'free_slots.slots': 4 });
  });

  it('replaces a single value with a list rather than spreading it', () => {
    expect(
      mergeWideEventFields({ 'mcp.tools': 'list_songs' }, { 'mcp.tools': ['get_song'] }),
    ).toStrictEqual({ 'mcp.tools': ['get_song'] });
  });

  it('replaces a list with a single value rather than appending it', () => {
    expect(
      mergeWideEventFields({ 'mcp.tools': ['list_songs'] }, { 'mcp.tools': 'get_song' }),
    ).toStrictEqual({ 'mcp.tools': 'get_song' });
  });

  it('leaves the held fields untouched', () => {
    const held = { 'product.events': ['take_created'] };

    mergeWideEventFields(held, { 'product.events': ['push_sent'] });

    expect(held).toStrictEqual({ 'product.events': ['take_created'] });
  });
});

describe('buildDetachedFields', () => {
  it('sends a late field on its own line, naming the request it belonged to', () => {
    expect(
      buildDetachedFields(SERVICE, REQUEST_ID, { 'realtime.broadcast_failure': 'AggregateError' }),
    ).toStrictEqual({
      'service.name': 'pragma-api',
      'service.stage': 'prod',
      'service.version': 'abc123',
      'event.kind': 'detached',
      'request.id': REQUEST_ID,
      'realtime.broadcast_failure': 'AggregateError',
    });
  });

  it('leaves the request out when the field was added outside any request', () => {
    expect(
      buildDetachedFields(ANONYMOUS_SERVICE, undefined, { 'spotify.failure': 'TypeError' }),
    ).toStrictEqual({
      'service.name': 'pragma-api',
      'event.kind': 'detached',
      'spotify.failure': 'TypeError',
    });
  });
});

describe('selectRequestId', () => {
  it('reads the request id of an event', () => {
    expect(selectRequestId({ 'request.id': REQUEST_ID })).toBe(REQUEST_ID);
  });

  it('answers undefined for an event with no request id', () => {
    expect(selectRequestId({ 'event.kind': 'scheduled' })).toBeUndefined();
  });

  it('answers undefined when the request id is not text', () => {
    expect(selectRequestId({ 'request.id': ['not', 'text'] })).toBeUndefined();
  });
});

describe('serializeWideEvent', () => {
  it('writes the event as one JSON line', () => {
    expect(serializeWideEvent({ outcome: 'success', 'product.events': ['take_created'] })).toBe(
      '{"outcome":"success","product.events":["take_created"]}\n',
    );
  });
});

describe('selectLambdaRequestId', () => {
  it('reads the request id the Lambda handler put on the context environment', () => {
    expect(selectLambdaRequestId({ lambdaContext: { awsRequestId: 'aws-request-1' } })).toBe(
      'aws-request-1',
    );
  });

  it.each([
    ['no environment', undefined],
    ['a null environment', null],
    ['an environment that is text', 'lambdaContext'],
    ['a local server environment', { incoming: {}, outgoing: {} }],
    ['a null Lambda context', { lambdaContext: null }],
    ['a Lambda context with no request id', { lambdaContext: {} }],
    ['a request id that is not text', { lambdaContext: { awsRequestId: 7 } }],
  ])('answers undefined for %s', (_label, environment) => {
    expect(selectLambdaRequestId(environment)).toBeUndefined();
  });
});
