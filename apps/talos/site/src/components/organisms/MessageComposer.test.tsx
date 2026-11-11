import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { dismissToast } from '../../lib/toast.hook';
import { MessageComposer } from './MessageComposer';
import { ToastViewport } from './ToastViewport';

const PREAMBLE = encodeURIComponent('Tu es Talos. Réponds à ce message de Hugo :');
const NOT_CONFIGURED = jsonResponse({ error: "Talos n'est pas encore configuré." }, 503);
const FIRE_FAILED = jsonResponse({ error: "Talos n'a pas pu être lancé." }, 502);

function serveComposer(build: string | null, launchAnswer: Response = NOT_CONFIGURED): FetchStub {
  return stubFetch(async (request) => {
    const answer = request.url.endsWith('/api/messages/claude-code')
      ? jsonResponse({
          repository: 'proprietaire/notes',
          environments: { talos: 'env_lecture', build },
        })
      : launchAnswer.clone();
    return await Promise.resolve(answer);
  });
}

function renderComposer(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MessageComposer />
      <ToastViewport />
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('MessageComposer', () => {
  let fetchStub: FetchStub | null = null;

  afterEach(() => {
    act(() => {
      dismissToast();
    });
    cleanup();
    fetchStub?.restore();
  });

  it('sends nothing while the message is empty, and links the build environment alone', async () => {
    fetchStub = serveComposer('env_construction');
    renderComposer();
    const build = await screen.findByRole('link', { name: 'Construire' });
    expect(build.getAttribute('target')).toBe('_blank');
    expect(build.getAttribute('rel')).toBe('noopener');
    expect(build.getAttribute('href')).toBe(
      `https://claude.ai/code/new?repo=proprietaire%2Fnotes&environment=env_construction&q=${PREAMBLE}`,
    );
    expect(screen.getByRole('button', { name: 'Talos' })).toHaveProperty('disabled', true);
    expect(screen.queryByRole('link', { name: 'Talos' })).toBeNull();
  });

  it('carries the typed message and leaves out an environment that is not configured', async () => {
    fetchStub = serveComposer(null);
    renderComposer();
    await userEvent.type(screen.getByLabelText('Ton message'), 'Rappelle Julie');
    const build = await screen.findByRole('link', { name: 'Construire' });
    expect(build.getAttribute('href')).toBe(
      `https://claude.ai/code/new?repo=proprietaire%2Fnotes&q=${PREAMBLE}%0A%0ARappelle%20Julie`,
    );
    expect(screen.queryByText(/caractères/)).toBeNull();
  });

  it('warns about a message too long for a link, which is also too long to send', async () => {
    fetchStub = serveComposer(null);
    renderComposer();
    const field = screen.getByLabelText('Ton message');
    field.focus();
    await userEvent.paste('x'.repeat(6001));
    expect(await screen.findByText('6 001 / 6 000 caractères')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Talos' })).toHaveProperty('disabled', true);
  });

  it('falls back to the Claude Code link, with the text kept, while the routine is not configured', async () => {
    fetchStub = serveComposer('env_construction');
    renderComposer();
    await userEvent.type(screen.getByLabelText('Ton message'), 'Rappelle Julie');
    await userEvent.click(screen.getByRole('button', { name: 'Talos' }));
    const talos = await screen.findByRole('link', { name: 'Talos' });
    expect(talos.getAttribute('href')).toBe(
      `https://claude.ai/code/new?repo=proprietaire%2Fnotes&environment=env_lecture&q=${PREAMBLE}%0A%0ARappelle%20Julie`,
    );
    expect(talos.getAttribute('target')).toBe('_blank');
    expect(screen.queryByRole('button', { name: 'Talos' })).toBeNull();
    expect(screen.getByLabelText('Ton message')).toHaveProperty('value', 'Rappelle Julie');
    expect(screen.getByRole('status').textContent).toBe(
      'Lancement indisponible : ouvre Claude Code',
    );
    expect(screen.getByRole('link', { name: 'Construire' })).toBeTruthy();
  });

  it('keeps the button and the text, and reports it, when the fire fails', async () => {
    fetchStub = serveComposer('env_construction', FIRE_FAILED);
    renderComposer();
    await userEvent.type(screen.getByLabelText('Ton message'), 'Rappelle Julie');
    await userEvent.click(screen.getByRole('button', { name: 'Talos' }));
    expect((await screen.findByRole('alert')).textContent).toContain("Talos n'a pas pu être lancé");
    expect(screen.getByRole('button', { name: 'Talos' })).toHaveProperty('disabled', false);
    expect(screen.queryByRole('link', { name: 'Talos' })).toBeNull();
    expect(screen.getByLabelText('Ton message')).toHaveProperty('value', 'Rappelle Julie');
  });
});
