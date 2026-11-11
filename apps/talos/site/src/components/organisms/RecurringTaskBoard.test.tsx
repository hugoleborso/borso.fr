import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import { RecurringTaskBoard } from './RecurringTaskBoard';

const WATCH = {
  id: 'veille-meteo',
  title: 'Veille météo',
  cadence: 'hebdomadaire',
  routine: 'nuit',
  what: 'Relever les prévisions de la semaine.',
  lastRunOn: '2026-11-05',
  nextRunOn: '2026-11-12',
  isDue: false,
};

const TASKS = [
  WATCH,
  {
    ...WATCH,
    id: 'tri-photos',
    title: 'Tri des photos',
    cadence: 'mensuelle',
    routine: 'collecte-mac',
    lastRunOn: '2026-10-10',
    nextRunOn: '2026-11-10',
    isDue: true,
  },
  {
    ...WATCH,
    id: 'revue-abonnements',
    title: 'Revue des abonnements',
    cadence: 'trimestrielle',
    lastRunOn: null,
    nextRunOn: '2026-11-09',
  },
  { ...WATCH, id: 'bilan-budget', title: 'Bilan du budget', nextRunOn: '2026-11-08', isDue: true },
];

function renderBoard(tasks: readonly unknown[]): FetchStub {
  const fetchStub = stubFetch(
    async () =>
      await Promise.resolve(jsonResponse({ generatedAt: '2026-11-11T18:06:25+01:00', tasks })),
  );
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter>
        <RecurringTaskBoard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return fetchStub;
}

// @FollowsBlueprint test-component-render
describe('the recurring tasks screen', () => {
  let fetchStub: FetchStub | null = null;

  afterEach(() => {
    cleanup();
    fetchStub?.restore();
  });

  it('says in its head how many tasks there are and how many are due, in the alert colour', async () => {
    fetchStub = renderBoard(TASKS);
    const dueCount = await screen.findByText('2 dues');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Tâches récurrentes');
    expect(dueCount.parentElement?.textContent).toBe('4 tâches · 2 dues');
    expect(dueCount.className).toContain('text-danger');
    expect(fetchStub.calls[0]?.url).toContain('/api/recurring-tasks');
  });

  it('keeps the due count calm when nothing is due', async () => {
    fetchStub = renderBoard([WATCH]);
    await screen.findByText('Veille météo');
    const dueCount = screen.getByText('0 due');
    expect(dueCount.parentElement?.textContent).toBe('1 tâche · 0 due');
    expect(dueCount.className).not.toContain('text-danger');
  });

  it('lists the due tasks first, then the soonest next run, each with its state in words', async () => {
    fetchStub = renderBoard(TASKS);
    const rows = await screen.findAllByRole('listitem');
    expect(rows.map((row) => row.querySelector('summary')?.textContent)).toStrictEqual([
      'dueBilan du budgethebdomadaire · Dernier lancement jeu. 5 nov. → Prochain lancement dim. 8 nov.',
      'dueTri des photosmensuelle · Dernier lancement sam. 10 oct. → Prochain lancement mar. 10 nov.',
      'à jourRevue des abonnementstrimestrielle · Dernier lancement jamais → Prochain lancement lun. 9 nov.',
      'à jourVeille météohebdomadaire · Dernier lancement jeu. 5 nov. → Prochain lancement jeu. 12 nov.',
    ]);
    expect(within(rows[0] ?? document.body).getByText('due').className).toBe('sr-only');
    expect(within(rows[3] ?? document.body).getByText('à jour').className).toBe('sr-only');
  });

  it('hides what a task does until its row is tapped, then shows it with its routine', async () => {
    fetchStub = renderBoard(TASKS);
    const [, row] = await screen.findAllByRole('listitem');
    const details = row?.querySelector('details');
    expect(details?.open).toBe(false);
    await userEvent.click(within(row ?? document.body).getByText('Tri des photos'));
    expect(details?.open).toBe(true);
    expect(details?.textContent).toContain('Relever les prévisions de la semaine.');
    expect(details?.textContent).toContain('Routine collecte-mac');
  });

  it('shows the faint empty state when there is no task', async () => {
    fetchStub = renderBoard([]);
    expect((await screen.findByText('Aucune tâche récurrente')).parentElement?.role).toBe('status');
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('leads back to the day', async () => {
    fetchStub = renderBoard([]);
    await screen.findByText('Aucune tâche récurrente');
    expect(screen.getByRole('link', { name: 'Retour' }).getAttribute('href')).toBe('/');
  });
});
