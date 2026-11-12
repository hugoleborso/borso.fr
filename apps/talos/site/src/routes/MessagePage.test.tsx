import { act, cleanup, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n/i18n.setup';
import { ToastViewport } from '../components/organisms/ToastViewport';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../lib/queries/queries.test-utils';
import { useDecideProposal } from '../lib/queries/proposals.queries';
import { routineKeys } from '../lib/queries/routine.queries';
import { dismissToast } from '../lib/toast.hook';
import { MessagePage } from './MessagePage';

const SESSION_URL = 'https://claude.ai/code/session_01ExempleInvente';
const MINUTE_MS = 60_000;
const HALF_MINUTE_MS = 30_000;
const HOUR_MS = 3_600_000;
const DEFAULT_STALE_TIME_MS = 30_000;

interface ServedRun {
  readonly id: string;
  readonly firedAt: string;
  readonly trigger: 'message' | 'proposition';
  readonly subject: string;
  readonly sessionUrl: string | null;
}

const DECIDED_PROPOSAL = {
  slug: '2026-10-04-atelier',
  category: 'action',
  status: 'acceptee',
  title: "Décaler la réunion pour l'atelier",
  priority: 'haute',
  createdOn: '2026-10-04',
  why: '',
  draft: '',
  decisions: ['2026-10-05 10:12 : acceptée'],
};

function firedAgo(milliseconds: number): string {
  return new Date(Date.now() - milliseconds).toISOString();
}

function serveMessageScreen(runs: () => readonly ServedRun[], written?: unknown): FetchStub {
  return stubFetch(async (request) => {
    if (request.url.endsWith('/api/messages/claude-code')) {
      return await Promise.resolve(
        jsonResponse({
          repository: 'proprietaire/notes',
          environments: { talos: null, build: null },
        }),
      );
    }
    if (request.method === 'POST') return await Promise.resolve(jsonResponse(written, 201));
    return await Promise.resolve(jsonResponse({ items: runs() }));
  });
}

function renderMessageScreen(queryClient: QueryClient = createIsolatedQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MessagePage />
      <ToastViewport />
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('the Message screen', () => {
  let fetchStub: FetchStub | null = null;

  afterEach(() => {
    act(() => {
      dismissToast();
    });
    cleanup();
    fetchStub?.restore();
  });

  it('lists the runs with what started each, its subject, its age and a plain link', async () => {
    fetchStub = serveMessageScreen(() => [
      {
        id: 'run-2',
        firedAt: firedAgo(5 * MINUTE_MS + HALF_MINUTE_MS),
        trigger: 'message',
        subject: 'Rappelle Julie',
        sessionUrl: SESSION_URL,
      },
      {
        id: 'run-1',
        firedAt: firedAgo(3 * HOUR_MS + HALF_MINUTE_MS),
        trigger: 'proposition',
        subject: 'etat/propositions/2026-10-04-atelier',
        sessionUrl: null,
      },
    ]);
    renderMessageScreen();
    const [newest, oldest] = await screen.findAllByRole('listitem');
    expect(newest?.textContent).toContain('Message · 5 min');
    expect(newest?.textContent).toContain('Rappelle Julie');
    const link = within(newest ?? document.body).getByRole('link', { name: 'Ouvrir' });
    expect(link.getAttribute('href')).toBe(SESSION_URL);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');
    expect(oldest?.textContent).toContain('Décision · 3 h');
    expect(oldest?.textContent).toContain('etat/propositions/2026-10-04-atelier');
    expect(within(oldest ?? document.body).queryByRole('link')).toBeNull();
  });

  it('lands on the list when the address names it, and stays put otherwise', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    fetchStub = serveMessageScreen(() => [
      {
        id: 'run-1',
        firedAt: firedAgo(MINUTE_MS),
        trigger: 'message',
        subject: 'Rappelle Julie',
        sessionUrl: null,
      },
    ]);
    const first = renderMessageScreen();
    await screen.findAllByRole('listitem');
    expect(scrollIntoView).not.toHaveBeenCalled();
    first.unmount();
    window.history.replaceState(null, '', '/message#runs');
    renderMessageScreen();
    await screen.findAllByRole('listitem');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(document.querySelector('#runs')?.textContent).toContain('Lancements');
    window.history.replaceState(null, '', '/');
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  });

  it('hides the list while no run was fired', async () => {
    fetchStub = serveMessageScreen(() => []);
    renderMessageScreen();
    await screen.findByRole('link', { name: 'Construire' });
    expect(fetchStub.calls.some((request) => request.url.endsWith('/api/routine/runs'))).toBe(true);
    expect(screen.queryByText('Lancements')).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('sends the message, empties the field, confirms, and shows the new run first with its link', async () => {
    fetchStub = serveMessageScreen(
      () => [
        {
          id: 'run-1',
          firedAt: firedAgo(3 * HOUR_MS + HALF_MINUTE_MS),
          trigger: 'proposition',
          subject: 'etat/propositions/2026-10-04-atelier',
          sessionUrl: null,
        },
      ],
      {
        id: 'run-2',
        firedAt: new Date().toISOString(),
        trigger: 'message',
        subject: 'Rappelle Julie',
        sessionUrl: SESSION_URL,
      },
    );
    renderMessageScreen();
    await screen.findAllByRole('listitem');
    await userEvent.type(screen.getByLabelText('Ton message'), 'Rappelle Julie');
    await userEvent.click(screen.getByRole('button', { name: 'Talos' }));
    expect((await screen.findByRole('status')).textContent).toBe('Talos est lancé');
    const sent = fetchStub.calls.find((request) => request.method === 'POST');
    expect(sent?.url.endsWith('/api/routine/runs')).toBe(true);
    expect(await sent?.json()).toEqual({ text: 'Rappelle Julie' });
    expect(screen.getByLabelText('Ton message')).toHaveProperty('value', '');
    const [newest, previous] = screen.getAllByRole('listitem');
    expect(newest?.textContent).toContain('Message · 0 min');
    expect(
      within(newest ?? document.body)
        .getByRole('link', { name: 'Ouvrir' })
        .getAttribute('href'),
    ).toBe(SESSION_URL);
    expect(previous?.textContent).toContain('Décision');
    expect(
      fetchStub.calls.filter(
        (request) => request.method === 'GET' && request.url.endsWith('/api/routine/runs'),
      ),
    ).toHaveLength(1);
  });

  it('reads the list again after a decision, the next time the screen is shown', async () => {
    const served: ServedRun[] = [];
    fetchStub = serveMessageScreen(() => served, DECIDED_PROPOSAL);
    const queryClient = createIsolatedQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false, staleTime: DEFAULT_STALE_TIME_MS } });
    const firstVisit = renderMessageScreen(queryClient);
    await screen.findByRole('link', { name: 'Construire' });
    await waitFor(() => {
      expect(queryClient.getQueryData(routineKeys.runs())).toEqual({ items: [] });
    });
    firstVisit.unmount();
    served.push({
      id: 'run-1',
      firedAt: firedAgo(MINUTE_MS + HALF_MINUTE_MS),
      trigger: 'proposition',
      subject: 'etat/propositions/2026-10-04-atelier',
      sessionUrl: SESSION_URL,
    });
    const decision = renderHook(() => useDecideProposal(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });
    await act(async () => {
      await decision.result.current.mutateAsync({
        slug: '2026-10-04-atelier',
        decision: 'acceptee',
      });
    });
    decision.unmount();
    renderMessageScreen(queryClient);
    expect((await screen.findByRole('listitem')).textContent).toContain('Décision · 1 min');
  });
});
