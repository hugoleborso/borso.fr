import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, TEST_SECRETS } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { seedMemoryInDatabase, writeMemory } from '../../../test/memory-fixture';

const MAC = { authorization: `Bearer ${TEST_SECRETS['agent-token-mac'] ?? ''}` };
const GARDEN = 'second-brain/domaines/jardin';
const VEGETABLES = 'second-brain/projets/potager';
const GREENHOUSE = 'second-brain/projets/serre';
const COMPOST = 'second-brain/projets/compost';
const ORCHARD = 'second-brain/projets/verger';
const FRONT_MATTER = '---\ntype: domaine\nresume_le: 2026-10-20\nproximite: 4\n---\n';
const STORED_BODY = `# Jardin\n\n## En bref\n\nLe jardin et ses chantiers.\n\n## Projets liés\n\n- [[${VEGETABLES}]] : actif\n- [[${ORCHARD}]] : à relancer\n\n## Chronologie\n\n- 2026-10-20 : résumé réécrit.\n\n## Faits\n\n## Relations\n`;
const CONTAINED_LINES = `- [[${VEGETABLES}]] | statut: actif | meteo: vert | prochaine_etape: Semer les fèves | echeance: 2026-11-30\n- [[${GREENHOUSE}]] | statut: en-pause | meteo: orange | prochaine_etape: Commander les vitres\n`;
const RECENT_FACT_LINES = `- 2026-11-05 | [[${COMPOST}]] | bac: le deuxième est plein\n- 2026-11-02 | [[${VEGETABLES}]] | fèves commandées | src: journal/2026-10-05\n`;
const RENDERED_BODY = `# Jardin\n\n## En bref\n\nLe jardin et ses chantiers.\n\n## Projets liés\n\n- [[${VEGETABLES}]] : actif\n- [[${ORCHARD}]] : à relancer\n\n## Chronologie\n\n- 2026-10-20 : résumé réécrit.\n\n## Faits\n\n- surface: 300 m²\n## Relations\n\n- comprend → [[${VEGETABLES}]] | depuis: 2026-03\n- comprend → [[${GREENHOUSE}]] | depuis: 2026-05\n- comprend → [[${ORCHARD}]] | depuis: 2026-03 | jusqu'à: 2026-09\n\n## Comprend\n\n${CONTAINED_LINES}\n## Faits récents\n\n${RECENT_FACT_LINES}`;

interface AgentPage {
  readonly markdown: string;
  readonly outgoing: string[];
}

async function readAgentPage(slug: string): Promise<AgentPage> {
  const { app } = buildTestContext();
  const response = await requestJson(app, `/api/agent/page?slug=${slug}`, { headers: MAC });
  const page: AgentPage = await response.json();
  return page;
}

async function readStoredBody(slug: string): Promise<string | undefined> {
  const { app } = buildTestContext();
  const response = await requestJson(app, '/api/agent/export', { headers: MAC });
  const exported: { tables: { memory_entity: { slug: string; body: string }[] } } =
    await response.json();
  return exported.tables.memory_entity.find((entity) => entity.slug === slug)?.body;
}

beforeEach(async () => {
  await truncateAllTables();
  await seedMemoryInDatabase();
});

// @FollowsBlueprint test-back-e2e
describe('GET /api/agent/page, the computed sections', () => {
  it('lists what a domain contains and what moved below it, two levels down, and keeps « Projets liés »', async () => {
    const page = await readAgentPage(GARDEN);
    expect(page).toEqual({
      slug: GARDEN,
      type: 'entity',
      markdown: `${FRONT_MATTER}${RENDERED_BODY}`,
      outgoing: [COMPOST, VEGETABLES, GREENHOUSE, ORCHARD],
      incoming: [],
    });
    expect(page.markdown).not.toContain(`- [[${ORCHARD}]]\n`);
    expect(page.markdown).not.toContain('pommier arraché');
    expect(page.markdown).not.toContain('| planches: 6');
    expect(page.markdown).not.toContain(`[[${GARDEN}]] | surface`);
  });

  it('lists a project inside a project, and no recent facts when none is in the window', async () => {
    const page = await readAgentPage(VEGETABLES);
    expect(page.markdown).toContain(`\n## Comprend\n\n- [[${COMPOST}]] | statut: actif\n`);
    expect(page.markdown).not.toContain('## Faits récents');
  });

  it('adds no section to a page that contains nothing', async () => {
    const page = await readAgentPage('second-brain/personnes/alice-martin');
    expect(page.markdown).not.toContain('## Comprend');
    expect(page.markdown).not.toContain('## Faits récents');
    expect((await readAgentPage(GREENHOUSE)).markdown).not.toContain('## Comprend');
  });

  it('lists a contained page that no longer exists by its slug alone', async () => {
    await writeMemory(
      [{ op: 'relation.add', from: GARDEN, verb: 'comprend', to: 'https://exemple.test/ruches' }],
      'missing-page',
    );
    const page = await readAgentPage(GARDEN);
    expect(page.markdown).toContain(`${CONTAINED_LINES}- [[https://exemple.test/ruches]]\n`);
  });

  it('stores no computed line when a page read is written back, the headings kept in place', async () => {
    const page = await readAgentPage(GARDEN);
    const body = page.markdown.slice(FRONT_MATTER.length);
    expect(body).toContain(CONTAINED_LINES);
    expect(body).toContain(RECENT_FACT_LINES);
    await writeMemory(
      [{ op: 'entity.upsert', slug: GARDEN, kind: 'domaine', title: 'Jardin', body }],
      'write-back',
    );
    const stored = await readStoredBody(GARDEN);
    expect(stored).not.toContain(`[[${VEGETABLES}]] | statut`);
    expect(stored).not.toContain(`[[${GREENHOUSE}]] | statut`);
    expect(stored).not.toContain('2026-11-05 |');
    expect(stored).not.toContain('2026-11-02 |');
    expect(stored).toContain('\n## Comprend\n\n\n## Faits récents\n\n');
    expect(stored).toContain('## Projets liés');
    const again = await readAgentPage(GARDEN);
    expect(again.markdown).toContain(`\n## Comprend\n\n${CONTAINED_LINES}\n## Faits récents\n\n`);
    expect(again.markdown.split(CONTAINED_LINES)).toHaveLength(2);
    expect(again.markdown.split(RECENT_FACT_LINES)).toHaveLength(2);
  });

  it('leaves the stored body of the seed untouched by a read', async () => {
    await readAgentPage(GARDEN);
    expect(await readStoredBody(GARDEN)).toBe(STORED_BODY);
  });
});
