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
import { BrainPageView } from './BrainPageView';

const PERSON = 'second-brain/personnes/agathe-roussel';
const DOMAIN = 'second-brain/domaines/jardin';
const FRESHNESS = { generatedAt: null, lateCount: 0, pages: [] };

function buildPage(title: string, frontMatter: Record<string, string>) {
  return {
    title,
    markdown: `# ${title}\n`,
    frontMatter,
    summarizedOn: null,
    incomingLinks: [],
    outgoingLinks: [],
  };
}

const PAGES: Record<string, unknown> = {
  [`/api/pages/${PERSON}`]: buildPage('Agathe Roussel', { type: 'personne', proximite: '4' }),
  [`/api/pages/${DOMAIN}`]: buildPage('Jardin', { type: 'domaine', proximite: '4' }),
};

// @FollowsBlueprint test-component-render
describe('a page of the second brain', () => {
  let fetchStub: FetchStub | null = null;

  afterEach(() => {
    cleanup();
    fetchStub?.restore();
  });

  async function readChips(path: string, title: string): Promise<(string | null)[]> {
    fetchStub = stubFetch(
      async (request) =>
        await Promise.resolve(jsonResponse(PAGES[new URL(request.url).pathname] ?? FRESHNESS)),
    );
    render(
      <QueryClientProvider client={createIsolatedQueryClient()}>
        <MemoryRouter>
          <BrainPageView path={path} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByRole('heading', { name: title });
    const [chipList] = screen.getAllByRole('list');
    return Array.from(chipList?.querySelectorAll('li') ?? [], (chip) => chip.textContent);
  }

  it('names the closeness of a person after its number', async () => {
    expect(await readChips(PERSON, 'Agathe Roussel')).toStrictEqual([
      'typepersonne',
      'proximite4 · Proches',
    ]);
  });

  it('leaves the closeness chip of a domain as its number alone', async () => {
    expect(await readChips(DOMAIN, 'Jardin')).toStrictEqual(['typedomaine', 'proximite4']);
  });
});
