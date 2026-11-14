import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  recordProductEvent,
  reportTaggedError,
  startErrorReporting,
} from './error-reporting.adapter';

const browserTracing = vi.hoisted(() => ({ name: 'BrowserTracing' }));

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(() => browserTracing),
}));

vi.mock('@sentry/react', () => sentry);

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';

describe('startErrorReporting', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reports errors tagged with the app, traces every page load, with personal data off and no trace header sent', () => {
    startErrorReporting({ dsn: DSN, environment: 'prod', tracesSampleRate: 1 });

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'prod',
      initialScope: { tags: { app: 'borsouvertures' } },
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
      },
      tracesSampleRate: 1,
      tracePropagationTargets: [],
      integrations: [browserTracing],
    });
  });
});

describe('recordProductEvent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('leaves a breadcrumb named after the event, with its details as data', () => {
    recordProductEvent({ name: 'card_reviewed', cardKind: 'move', outcome: 'missed' });
    expect(sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'product',
      type: 'info',
      level: 'info',
      message: 'card_reviewed',
      data: { cardKind: 'move', outcome: 'missed' },
    });
  });

  it('leaves empty data for an event with no detail', () => {
    recordProductEvent({ name: 'review_session_started' });
    expect(sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'product',
      type: 'info',
      level: 'info',
      message: 'review_session_started',
      data: {},
    });
  });
});

describe('reportTaggedError', () => {
  it('sends the error with its tags', () => {
    const error = new Error('store');
    reportTaggedError(error, { operation: 'write' });
    expect(sentry.captureException).toHaveBeenCalledWith(error, { tags: { operation: 'write' } });
  });
});
