import { cleanup, render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { CommitmentBoard } from './CommitmentBoard';

// @FollowsBlueprint test-component-render
describe('the commitments screen', () => {
  let fetchStub: FetchStub | null = null;

  afterEach(() => {
    cleanup();
    fetchStub?.restore();
  });

  it('leads back to the day', async () => {
    fetchStub = stubFetch(async () => await Promise.resolve(jsonResponse({ items: [] })));
    render(
      <QueryClientProvider client={createIsolatedQueryClient()}>
        <MemoryRouter>
          <CommitmentBoard />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByText('Aucun engagement');
    expect(screen.getByRole('link', { name: 'Retour' }).getAttribute('href')).toBe('/');
  });
});
