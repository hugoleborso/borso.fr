import { describe, expect, it } from 'vitest';
import { composeContext, type ContextInput, listIndexLines } from './memory-context.core';

const NOW = new Date('2026-10-16T06:00:00Z');
const ENTITY = { kind: 'personne', summary: null, closeness: null, archived: false };
const INPUT: ContextInput = {
  preferences: [{ slug: 'preferences/redaction', content: 'Court.\n' }],
  focus: [
    { title: 'Atelier Acme', why: 'date proche', horizon: '2026-10-20' },
    { title: 'Voyage', why: null, horizon: null },
    { title: '', why: null, horizon: null },
  ],
  todos: [
    {
      list: 'personal',
      text: 'Envoyer le devis',
      done: false,
      removed: false,
      dueDate: '2026-10-18',
    },
    { list: 'personal', text: 'Fait', done: true, removed: false, dueDate: null },
    { list: 'personal', text: 'Retirée', done: false, removed: true, dueDate: null },
    { list: 'work', text: 'Relire la PR', done: false, removed: false, dueDate: null },
  ],
  commitments: [
    {
      slug: 'engagements/devis-acme',
      status: 'ouvert',
      action: 'Envoyer le devis',
      due: '2026-10-18',
    },
    { slug: 'engagements/sans-date', status: 'ouvert', action: null, due: null },
    { slug: 'engagements/clos', status: 'fait', action: 'x', due: null },
  ],
  cursors: { gmail: '2026-10-15' },
  lastScan: undefined,
  events: [
    {
      occurredAt: NOW,
      actor: 'routine:nuit',
      operation: 'state.set',
      objectId: 'cursors',
      summary: 'scan',
    },
  ],
  entities: [
    {
      ...ENTITY,
      slug: 'second-brain/organisations/acme',
      kind: 'organisation',
      title: 'Acme',
      summary: 'Client',
      closeness: 3,
    },
    {
      ...ENTITY,
      slug: 'second-brain/personnes/alice',
      title: 'Alice',
      summary: 'a'.repeat(100),
      closeness: 2,
    },
    { ...ENTITY, slug: 'second-brain/personnes/bruno', title: 'Bruno', closeness: 5 },
    { ...ENTITY, slug: 'second-brain/personnes/clara', title: 'Clara' },
    { ...ENTITY, slug: 'second-brain/personnes/vieux', title: 'Vieux', archived: true },
  ],
};

describe('listIndexLines', () => {
  it('sorts by kind then closeness, skips archived pages and truncates summaries to 80 characters', () => {
    expect(listIndexLines(INPUT.entities)).toEqual([
      '- [[second-brain/organisations/acme]] (p3) — Acme : Client',
      '- [[second-brain/personnes/bruno]] (p5) — Bruno : ',
      `- [[second-brain/personnes/alice]] (p2) — Alice : ${'a'.repeat(80)}…`,
      '- [[second-brain/personnes/clara]] (p?) — Clara : ',
    ]);
  });
});

describe('composeContext', () => {
  it('writes every section in order', () => {
    const markdown = composeContext(INPUT, NOW, 80_000);
    expect(markdown).toContain('# Contexte Talos (2026-10-16T06:00:00.000Z)');
    expect(markdown.indexOf('## Préférences')).toBeLessThan(markdown.indexOf('## Focus'));
    expect(markdown).toContain('### preferences/redaction\n\nCourt.');
    expect(markdown).toContain(
      '- **Atelier Acme** — date proche | horizon: 2026-10-20\n- **Voyage**\n',
    );
    expect(markdown).toContain(
      '## Todo\n\n- Envoyer le devis (échéance 2026-10-18)\n\n## Todo taff\n\n- Relire la PR\n',
    );
    expect(markdown).toContain(
      '- [[engagements/devis-acme]] — Envoyer le devis (échéance 2026-10-18)\n- [[engagements/sans-date]] — \n\n',
    );
    expect(markdown).toContain('- curseurs : {"gmail":"2026-10-15"}\n- dernier scan : null');
    expect(markdown).toContain('- 2026-10-16T06:00:00.000Z routine:nuit state.set cursors — scan');
    expect(markdown.endsWith('- [[second-brain/personnes/clara]] (p?) — Clara : ')).toBe(true);
  });

  it('cuts whole index lines last to fit the budget and says how many', () => {
    const full = composeContext(INPUT, NOW, 80_000);
    const markdown = composeContext(INPUT, NOW, full.length - 20);
    expect(markdown).toContain('- [[second-brain/personnes/alice]]');
    expect(markdown).not.toContain('Clara');
    expect(markdown.endsWith('… 1 entrées coupées pour tenir le budget')).toBe(true);
  });
});
