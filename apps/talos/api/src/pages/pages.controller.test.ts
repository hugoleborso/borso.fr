import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { seedMemoryInDatabase } from '../../../test/memory-fixture';
import { formatParisDate } from '../helpers/calendar/paris-clock.utils';

const GARDEN = 'second-brain/domaines/jardin';
const VEGETABLES = 'second-brain/projets/potager';
const GREENHOUSE = 'second-brain/projets/serre';

beforeEach(async () => {
  await truncateAllTables();
});

// @FollowsBlueprint test-back-e2e
describe('GET /api/pages/*', () => {
  beforeEach(async () => {
    await seedMemoryInDatabase();
  });

  it('renders a stored entity with its outgoing and incoming links', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/pages/second-brain/personnes/alice-martin', {
      cookie: await signIn(),
    });
    expect(await response.json()).toMatchObject({
      path: 'second-brain/personnes/alice-martin',
      title: 'Alice Martin',
      type: 'personne',
      outgoingLinks: ['second-brain/organisations/acme'],
      incomingLinks: ['second-brain/hugo'],
    });
  });

  it('computes what a domain contains and what moved below it, without the hand-written copy', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, `/api/pages/${GARDEN}`, { cookie: await signIn() });
    const page: { markdown: string; summarizedOn: string | null } = await response.json();
    expect(page.summarizedOn).toBe('2026-10-20');
    expect(page.markdown).toContain(
      `\n## Comprend\n\n- [[${VEGETABLES}]] | statut: actif | meteo: vert | prochaine_etape: Semer les fèves | echeance: 2026-11-30\n- [[${GREENHOUSE}]] | statut: en-pause | meteo: orange | prochaine_etape: Commander les vitres\n\n## Faits récents\n\n- 2026-11-05 | [[second-brain/projets/compost]] | bac: le deuxième est plein\n- 2026-11-02 | [[${VEGETABLES}]] | fèves commandées | src: journal/2026-10-05\n`,
    );
    expect(page.markdown).toContain(
      `- comprend → [[second-brain/projets/verger]] | depuis: 2026-03 | jusqu'à: 2026-09\n`,
    );
    expect(page.markdown).not.toContain('- [[second-brain/projets/verger]]');
    expect(page.markdown).not.toContain('pommier arraché');
    expect(page.markdown).not.toContain('| planches: 6');
    expect(page.markdown).not.toContain('Projets liés');
    expect(page.markdown).toContain('## Chronologie\n\n- 2026-10-20 : résumé réécrit.');
  });

  it('dates the summary of an entity from maj, then from its last update, and of nothing else', async () => {
    const { app } = buildTestContext();
    const cookie = await signIn();
    const readSummaryDay = async (slug: string): Promise<unknown> => {
      const page: { summarizedOn: unknown } = await (
        await requestJson(app, `/api/pages/${slug}`, { cookie })
      ).json();
      return page.summarizedOn;
    };
    expect(await readSummaryDay(GREENHOUSE)).toBe('2026-09-12');
    expect(await readSummaryDay(VEGETABLES)).toBe(formatParisDate(new Date()));
    expect(await readSummaryDay('etat/propositions/2026-10-04-atelier')).toBeNull();
    expect(await readSummaryDay('journal/2026-10-05')).toBeNull();
  });

  it('renders any slug of the memory, a proposal included', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/pages/etat/propositions/2026-10-04-atelier', {
      cookie: await signIn(),
    });
    expect(await response.json()).toMatchObject({ type: 'proposition' });
  });

  it('answers 404 for a slug the memory does not hold', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/pages/second-brain/inconnu', {
      cookie: await signIn(),
    });
    expect(response.status).toBe(404);
  });
});
