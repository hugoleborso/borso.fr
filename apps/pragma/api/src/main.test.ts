import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STREAK_REMINDER_JOB } from '../../domain/scheduled-job.core';

const httpHandler = vi.fn(() => Promise.resolve({ statusCode: 200 }));
const flushErrorReports = vi.fn(() => Promise.resolve());
const reportUnhandledError = vi.fn();
const reminderClocks: Date[] = [];
const runStreakReminder = vi.fn((now: Date) => {
  reminderClocks.push(now);
  return Promise.resolve();
});

vi.mock('hono/aws-lambda', () => ({ handle: () => httpHandler }));
vi.mock('./app', () => ({ createApp: () => ({}) }));
vi.mock('./streaks/streak-reminder.service', () => ({
  runStreakReminder: (now: Date) => runStreakReminder(now),
}));
vi.mock(import('./helpers/observability/error-reporting.adapter'), async (importOriginal) => ({
  ...(await importOriginal()),
  flushErrorReports: () => flushErrorReports(),
  reportUnhandledError: (error: unknown) => {
    reportUnhandledError(error);
  },
  startErrorReporting: () => undefined,
}));

async function loadHandler() {
  vi.resetModules();
  const module = await import('./main');
  return module.handler;
}

type Handler = Awaited<ReturnType<typeof loadHandler>>;
type HandlerEvent = Parameters<Handler>[0];

const HTTP_EVENT: HandlerEvent = {
  httpMethod: 'GET',
  path: '/api/health',
  headers: {},
  body: null,
  isBase64Encoded: false,
  requestContext: { elb: { targetGroupArn: 'arn:aws:elasticloadbalancing:test' } },
};

const REMINDER_EVENT: HandlerEvent = { job: STREAK_REMINDER_JOB };

describe('handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reminderClocks.length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('flushes once for one HTTP invocation, whatever the request did', async () => {
    const handler = await loadHandler();

    await handler(HTTP_EVENT);

    expect(httpHandler).toHaveBeenCalledOnce();
    expect(flushErrorReports).toHaveBeenCalledOnce();
  });

  it('returns what the HTTP handler answered', async () => {
    const handler = await loadHandler();

    await expect(handler(HTTP_EVENT)).resolves.toEqual({ statusCode: 200 });
  });

  it('flushes even when the HTTP handler throws, so the report is not lost', async () => {
    const failure = new Error('boom');
    httpHandler.mockRejectedValueOnce(failure);
    const handler = await loadHandler();

    await expect(handler(HTTP_EVENT)).rejects.toThrow('boom');

    expect(flushErrorReports).toHaveBeenCalledOnce();
  });

  it('runs the streak reminder on its own event, and flushes that invocation too', async () => {
    const handler = await loadHandler();

    await handler(REMINDER_EVENT);

    expect(runStreakReminder).toHaveBeenCalledOnce();
    expect(reminderClocks.at(0)).toBeInstanceOf(Date);
    expect(httpHandler).not.toHaveBeenCalled();
    expect(flushErrorReports).toHaveBeenCalledOnce();
  });

  it('reports and rethrows a failing streak reminder, then flushes', async () => {
    runStreakReminder.mockRejectedValueOnce(new Error('reminder down'));
    const handler = await loadHandler();

    await expect(handler(REMINDER_EVENT)).rejects.toThrow('reminder down');

    expect(reportUnhandledError).toHaveBeenCalledOnce();
    expect(flushErrorReports).toHaveBeenCalledOnce();
  });
});
