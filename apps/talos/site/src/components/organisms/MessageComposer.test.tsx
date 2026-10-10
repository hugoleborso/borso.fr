import { cleanup, render, screen } from '@testing-library/react';
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
import { MessageComposer } from './MessageComposer';

const PREAMBLE = encodeURIComponent(
  'Tu es Talos. Lis CLAUDE.md puis réponds à ce message de Hugo :',
);

function serveTarget(build: string | null): FetchStub {
  return stubFetch(
    async () =>
      await Promise.resolve(
        jsonResponse({
          repository: 'proprietaire/notes',
          environments: { talos: 'env_lecture', build },
        }),
      ),
  );
}

function renderComposer(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MessageComposer />
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('MessageComposer', () => {
  let fetchStub: FetchStub | null = null;

  afterEach(() => {
    cleanup();
    fetchStub?.restore();
  });

  it('opens Claude Code in a new tab on the chosen environment with the preamble alone', async () => {
    fetchStub = serveTarget('env_construction');
    renderComposer();
    const talos = await screen.findByRole('link', { name: 'Talos' });
    expect(talos.getAttribute('target')).toBe('_blank');
    expect(talos.getAttribute('rel')).toBe('noopener');
    expect(talos.getAttribute('href')).toBe(
      `https://claude.ai/code/new?repo=proprietaire%2Fnotes&environment=env_lecture&q=${PREAMBLE}`,
    );
    expect(screen.getByRole('link', { name: 'Construire' }).getAttribute('href')).toContain(
      'environment=env_construction&',
    );
  });

  it('carries the typed message and leaves out an environment that is not configured', async () => {
    fetchStub = serveTarget(null);
    renderComposer();
    await userEvent.type(screen.getByLabelText('Ton message'), 'Rappelle Julie');
    const build = await screen.findByRole('link', { name: 'Construire' });
    expect(build.getAttribute('href')).toBe(
      `https://claude.ai/code/new?repo=proprietaire%2Fnotes&q=${PREAMBLE}%0A%0ARappelle%20Julie`,
    );
    expect(screen.queryByText(/caractères/)).toBeNull();
  });

  it('warns about a message too long for a link', async () => {
    fetchStub = serveTarget(null);
    renderComposer();
    const field = screen.getByLabelText('Ton message');
    field.focus();
    await userEvent.paste('x'.repeat(6001));
    expect(await screen.findByText('6 001 / 6 000 caractères')).toBeTruthy();
  });
});
