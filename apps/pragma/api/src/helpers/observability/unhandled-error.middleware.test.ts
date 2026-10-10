import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildUnhandledErrorAnswer } from './unhandled-error.middleware';

const TEAPOT_STATUS = 418;

function buildFailingApp(failure: Error, reportFailure: (error: unknown) => void): Hono {
  return new Hono().onError(buildUnhandledErrorAnswer(reportFailure)).get('/fail', () => {
    throw failure;
  });
}

// @FollowsBlueprint test-middleware-integration
describe('buildUnhandledErrorAnswer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports an unexpected failure and answers 500 without its message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const reportFailure = vi.fn();
    const failure = new Error('secret detail');

    const response = await buildFailingApp(failure, reportFailure).request('/fail');

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Internal Server Error');
    expect(reportFailure).toHaveBeenCalledWith(failure);
  });

  it('answers a deliberate refusal with its own response and reports nothing', async () => {
    const reportFailure = vi.fn();
    const refusal = new HTTPException(TEAPOT_STATUS, { message: 'short and stout' });

    const response = await buildFailingApp(refusal, reportFailure).request('/fail');

    expect(response.status).toBe(TEAPOT_STATUS);
    expect(await response.text()).toBe('short and stout');
    expect(reportFailure).not.toHaveBeenCalled();
  });
});
