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
import { RelationsBoard } from './RelationsBoard';

function buildPerson(title: string, closeness: number | null) {
  return {
    page: `second-brain/personnes/${title.toLowerCase()}`,
    title,
    closeness,
    lastContactOn: null,
    silentDays: 40,
  };
}

const RELATIONS = {
  generatedAt: '2026-11-11',
  birthdays: [],
  toReconnect: [
    buildPerson('Agathe', 3),
    buildPerson('Basile', 0),
    buildPerson('Colette', null),
    buildPerson('Damien', 6),
  ],
};

function readDot(title: string): { label: string | undefined; look: string | undefined } {
  const row = screen.getByText(title).closest('li');
  return {
    label: row?.querySelector('.sr-only')?.textContent,
    look: row?.querySelector('[aria-hidden="true"].rounded-full')?.className,
  };
}

// @FollowsBlueprint test-component-render
describe('the relations screen', () => {
  let fetchStub: FetchStub | null = null;

  afterEach(() => {
    cleanup();
    fetchStub?.restore();
  });

  it('says the name and the level of each person, and gives a 0 a look apart from no closeness', async () => {
    fetchStub = stubFetch(async () => await Promise.resolve(jsonResponse(RELATIONS)));
    render(
      <QueryClientProvider client={createIsolatedQueryClient()}>
        <MemoryRouter>
          <RelationsBoard />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByText('Agathe');
    expect(readDot('Agathe').label).toBe('Amis, 3 sur 5');
    expect(readDot('Basile').label).toBe('Contacts, 0 sur 5');
    expect(readDot('Colette').label).toBe('Proximité non notée');
    expect(readDot('Damien').label).toBe('Proximité 6');
    expect(readDot('Basile').look).toContain('bg-bronze/10');
    expect(readDot('Colette').look).toContain('bg-transparent');
    expect(readDot('Agathe').look).toContain('bg-bronze/60');
  });
});
