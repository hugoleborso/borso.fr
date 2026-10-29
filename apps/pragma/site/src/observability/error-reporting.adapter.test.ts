import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  recordTakeBreadcrumb,
  reportRenderFailure,
  reportEntryNoteSaveFailed,
  reportSetlistBatchAddFailed,
  reportTakeQueueWriteFailed,
  reportTakeUploadFailed,
  startErrorReporting,
} from './error-reporting.adapter';

const ROUTER_TRACING = { name: 'reactRouterBrowserTracing' };

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureReactException: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  reactRouterBrowserTracingIntegration: vi.fn(() => ROUTER_TRACING),
  wrapReactRouterRouting: vi.fn((routes: unknown) => routes),
}));

vi.mock('@sentry/react', () => sentry);

const DSN = 'https://public-key@o1.ingest.de.sentry.io/2';
const API_ONLY = /^https:\/\/pragma\.borso\.fr\/api\//;

describe('startErrorReporting', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts nothing when no project is configured', () => {
    startErrorReporting(undefined);

    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('starts route-named tracing that sends trace headers to the API only, with personal data off', () => {
    startErrorReporting({
      dsn: DSN,
      environment: 'prod',
      tracesSampleRate: 1,
      tracePropagationTargets: [API_ONLY],
    });

    expect(sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'prod',
      initialScope: { tags: { app: 'pragma' } },
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
      },
      tracesSampleRate: 1,
      tracePropagationTargets: [API_ONLY],
      integrations: [ROUTER_TRACING],
    });
    expect(sentry.reactRouterBrowserTracingIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        useLocation: expect.any(Function),
        useNavigationType: expect.any(Function),
        createRoutesFromChildren: expect.any(Function),
        matchRoutes: expect.any(Function),
      }),
    );
  });
});

describe('reportRenderFailure', () => {
  it('hands the failure and the component stack to the SDK', () => {
    const failure = new Error('render broke');

    reportRenderFailure(failure, '\n    at SongPage');

    expect(sentry.captureReactException).toHaveBeenCalledWith(failure, {
      componentStack: '\n    at SongPage',
    });
  });
});

describe('take failures', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reports an exhausted upload tagged with the stage and the status', () => {
    reportTakeUploadFailed({ stage: 'put', status: 500 });
    expect(sentry.captureMessage).toHaveBeenCalledWith('TakeUploadFailed', {
      level: 'error',
      tags: { 'take.stage': 'put', 'take.status': '500' },
    });
  });

  it('names a network failure as having no status', () => {
    reportTakeUploadFailed({ stage: 'sign', status: null });
    expect(sentry.captureMessage).toHaveBeenCalledWith('TakeUploadFailed', {
      level: 'error',
      tags: { 'take.stage': 'sign', 'take.status': 'none' },
    });
  });

  it('reports a refused queue write', () => {
    const refusal = new Error('blocked');
    reportTakeQueueWriteFailed(refusal);
    expect(sentry.captureException).toHaveBeenCalledWith(refusal, {
      tags: { 'take.stage': 'queue' },
      extra: { name: 'TakeQueueWriteFailed' },
    });
  });

  it('leaves a breadcrumb rather than an error for an interrupted recording', () => {
    recordTakeBreadcrumb('RecordingInterrupted');
    expect(sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'takes',
      message: 'RecordingInterrupted',
      level: 'info',
    });
  });
});

describe('entry note failures', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reports a note save that failed, tagged with its setlist', () => {
    reportEntryNoteSaveFailed('setlist-1');
    expect(sentry.captureMessage).toHaveBeenCalledWith('EntryNoteSaveError', {
      level: 'error',
      tags: { 'setlist.id': 'setlist-1' },
    });
  });

  it('reports a batch add that failed, tagged with its setlist', () => {
    reportSetlistBatchAddFailed('setlist-2');
    expect(sentry.captureMessage).toHaveBeenCalledWith('SetlistBatchAddError', {
      level: 'error',
      tags: { 'setlist.id': 'setlist-2' },
    });
  });
});
