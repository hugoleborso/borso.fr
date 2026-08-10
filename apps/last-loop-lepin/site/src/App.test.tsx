import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { i18next } from './i18n/i18n';

vi.mock('./lib/api', () => ({
  api: {},
  apiUrl: (pathname: string) => pathname,
  ApiError: class ApiError extends Error {},
}));

vi.mock('./lib/queries/editions', () => ({
  useCurrentEdition: () => ({ data: undefined, isError: false }),
  useEditionList: () => ({ data: undefined }),
  editionKeys: { all: ['editions'] },
}));

vi.mock('./lib/queries/standings', () => ({
  useStandings: () => ({ data: undefined }),
  standingKeys: { all: ['standings'] },
}));

const { App } = await import('./App');

function Wrapper({ children }: { readonly children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('App', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('fr');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the navigation bar and the spectator screen at the root path', () => {
    render(<App />, { wrapper: Wrapper });
    expect(screen.getByRole('navigation')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Last Loop Lépin' })).toBeDefined();
  });

  it('offers the three navigation destinations', () => {
    render(<App />, { wrapper: Wrapper });
    expect(screen.getByRole('link', { name: 'Course' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Archives' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Admin' })).toBeDefined();
  });

  it('offers a language switcher', () => {
    render(<App />, { wrapper: Wrapper });
    expect(screen.getByRole('combobox', { name: 'Langue' })).toBeDefined();
  });

  it('announces that no edition is scheduled while the API has answered nothing', () => {
    render(<App />, { wrapper: Wrapper });
    expect(screen.getByText("Pas d'édition annoncée pour l'instant.")).toBeDefined();
  });
});
