import { describe, expect, it } from 'vitest';
import {
  buildFailureFields,
  buildHttpEndingFields,
  buildOpeningFields,
  buildReturnedFields,
  buildServiceFields,
  describeThrownValue,
  mergeWideEventFields,
  selectLambdaRequestId,
  selectRequestOutcome,
  serializeWideEvent,
} from './wide-event.core';

const REQUEST_ID = '6f1c5b9e-0000-4000-8000-000000000001';

function buildNamedFailure(): Error {
  const failure = new TypeError('cannot read the row');
  failure.stack = 'TypeError: cannot read the row\n    at rows.service.ts:12';
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
      message: 'cannot read the row',
      stack: 'TypeError: cannot read the row\n    at rows.service.ts:12',
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
      'error.message': 'cannot read the row',
      'error.stack': 'TypeError: cannot read the row\n    at rows.service.ts:12',
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
  it('names the service, its stage and its version', () => {
    expect(buildServiceFields({ stage: 'prod', version: '0123abcd' })).toStrictEqual({
      'service.name': 'borsouvertures-api',
      'service.stage': 'prod',
      'service.version': '0123abcd',
    });
  });

  it('leaves out a stage and a version the environment does not set', () => {
    expect(buildServiceFields({ stage: undefined, version: undefined })).toStrictEqual({
      'service.name': 'borsouvertures-api',
    });
  });
});

describe('buildOpeningFields', () => {
  it('opens the first event of an instance with the service and the base fields', () => {
    expect(
      buildOpeningFields(
        { service: { stage: 'prod', version: undefined }, isColdStart: true },
        { 'event.kind': 'http', 'request.id': REQUEST_ID, 'lambda.request_id': undefined },
      ),
    ).toStrictEqual({
      'service.name': 'borsouvertures-api',
      'service.stage': 'prod',
      'lambda.cold_start': true,
      'event.kind': 'http',
      'request.id': REQUEST_ID,
    });
  });

  it('marks a warm event as no cold start', () => {
    expect(
      buildOpeningFields(
        { service: { stage: undefined, version: undefined }, isColdStart: false },
        {},
      ),
    ).toStrictEqual({
      'service.name': 'borsouvertures-api',
      'lambda.cold_start': false,
    });
  });
});

describe('buildHttpEndingFields', () => {
  it('records the route, status and duration of a successful request', () => {
    expect(
      buildHttpEndingFields({
        route: '/api/rows/:rowId',
        status: 200,
        durationMilliseconds: 12,
        failure: undefined,
      }),
    ).toStrictEqual({
      'http.route': '/api/rows/:rowId',
      'http.response.status_code': 200,
      duration_ms: 12,
      outcome: 'success',
    });
  });

  it('records a refusal without the error that carried it', () => {
    expect(
      buildHttpEndingFields({
        route: '/api/rows',
        status: 404,
        durationMilliseconds: 3,
        failure: buildNamedFailure(),
      }),
    ).toStrictEqual({
      'http.route': '/api/rows',
      'http.response.status_code': 404,
      duration_ms: 3,
      outcome: 'refused',
    });
  });

  it('records the error that became a 500', () => {
    expect(
      buildHttpEndingFields({
        route: '/api/rows',
        status: 500,
        durationMilliseconds: 7,
        failure: buildNamedFailure(),
      }),
    ).toStrictEqual({
      'http.route': '/api/rows',
      'http.response.status_code': 500,
      duration_ms: 7,
      outcome: 'failed',
      'error.type': 'TypeError',
      'error.message': 'cannot read the row',
      'error.stack': 'TypeError: cannot read the row\n    at rows.service.ts:12',
    });
  });

  it('records a 500 that no thrown error explains as failed, with no error fields', () => {
    expect(
      buildHttpEndingFields({
        route: '/api/rows',
        status: 502,
        durationMilliseconds: 7,
        failure: undefined,
      }),
    ).toStrictEqual({
      'http.route': '/api/rows',
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
        { 'parameter_store.failed_parameters': ['/a'], 'event.kind': 'http' },
        { 'parameter_store.failed_parameters': ['/b'] },
      ),
    ).toStrictEqual({
      'parameter_store.failed_parameters': ['/a', '/b'],
      'event.kind': 'http',
    });
  });

  it('replaces a single value with the newer one', () => {
    expect(
      mergeWideEventFields({ outcome: 'success' }, { outcome: 'failed', 'rows.count': 4 }),
    ).toStrictEqual({ outcome: 'failed', 'rows.count': 4 });
  });

  it('replaces a single value with a list rather than spreading it', () => {
    expect(mergeWideEventFields({ tags: 'one' }, { tags: ['two'] })).toStrictEqual({
      tags: ['two'],
    });
  });

  it('replaces a list with a single value rather than appending it', () => {
    expect(mergeWideEventFields({ tags: ['one'] }, { tags: 'two' })).toStrictEqual({
      tags: 'two',
    });
  });

  it('leaves the held fields untouched', () => {
    const held = { tags: ['one'] };

    mergeWideEventFields(held, { tags: ['two'] });

    expect(held).toStrictEqual({ tags: ['one'] });
  });
});

describe('serializeWideEvent', () => {
  it('writes the event as one JSON line', () => {
    expect(serializeWideEvent({ outcome: 'success', tags: ['one'] })).toBe(
      '{"outcome":"success","tags":["one"]}\n',
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
