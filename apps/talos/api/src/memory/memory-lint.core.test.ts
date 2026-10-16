import { describe, expect, it } from 'vitest';
import { type LintInput, listMemoryIssues } from './memory-lint.core';

const ALICE = 'second-brain/personnes/alice-martin';
const ACME = 'second-brain/organisations/acme';
const LONELY = 'second-brain/concepts/seul';
const RELATION = { since: null, until: null, seen: null };

const INPUT: LintInput = {
  entities: [
    {
      slug: ALICE,
      body: 'Voir [[second-brain/personnes/fantome]]',
      closeness: null,
      archived: false,
    },
    {
      slug: ACME,
      body: 'Cliente : [[second-brain/personnes/alice-martin]]',
      closeness: 3,
      archived: false,
    },
    { slug: LONELY, body: '', closeness: 2, archived: false },
    { slug: 'second-brain/archives/x', body: '[[nulle-part]]', closeness: null, archived: true },
  ],
  relations: [
    {
      ...RELATION,
      id: 'r1',
      fromSlug: ALICE,
      verb: 'travaille_chez',
      toSlug: ACME,
      since: '2026-09',
      until: '2026-01',
    },
    {
      ...RELATION,
      id: 'r2',
      fromSlug: ALICE,
      verb: 'connait',
      toSlug: 'second-brain/personnes/fantome',
    },
    {
      ...RELATION,
      id: 'r3',
      fromSlug: ACME,
      verb: 'client',
      toSlug: 'Acme Holding',
      seen: '2026-01-15',
    },
    { ...RELATION, id: 'r4', fromSlug: ACME, verb: 'client', toSlug: ALICE, seen: '2026-09-01' },
    {
      ...RELATION,
      id: 'r5',
      fromSlug: ACME,
      verb: 'client',
      toSlug: ALICE,
      seen: '2025-01',
      until: '2025-06',
    },
  ],
  verbs: ['travaille_chez', 'client'],
  commitments: [
    { slug: 'engagements/devis', status: 'ouvert', due: '2026-10-15 18:00' },
    { slug: 'engagements/futur', status: 'ouvert', due: '2026-10-20' },
    { slug: 'engagements/sans-date', status: 'ouvert', due: null },
    { slug: 'engagements/fait', status: 'fait', due: '2026-01-01' },
  ],
  todos: [
    { id: 't1', done: true, removed: false, commitmentSlug: 'engagements/devis' },
    { id: 't2', done: false, removed: false, commitmentSlug: 'engagements/fait' },
    { id: 't3', done: false, removed: false, commitmentSlug: 'engagements/futur' },
    { id: 't4', done: true, removed: true, commitmentSlug: 'engagements/devis' },
    { id: 't5', done: true, removed: false, commitmentSlug: null },
  ],
  knownSlugs: [ALICE, ACME, LONELY, 'engagements/devis'],
};

describe('listMemoryIssues', () => {
  it('reports each rule once where it applies', () => {
    expect(listMemoryIssues(INPUT, '2026-10-16')).toEqual([
      { code: 'missing-closeness', slug: ALICE, message: 'proximite absente' },
      {
        code: 'broken-link',
        slug: ALICE,
        message: '[[second-brain/personnes/fantome]] introuvable',
      },
      { code: 'orphan-page', slug: LONELY, message: 'aucune relation ni lien entrant' },
      {
        code: 'since-after-until',
        slug: ALICE,
        message: "travaille_chez → second-brain/organisations/acme : depuis après jusqu'à",
      },
      { code: 'unknown-verb', slug: ALICE, message: 'verbe inconnu : connait' },
      {
        code: 'broken-link',
        slug: ALICE,
        message: 'connait → second-brain/personnes/fantome : cible introuvable',
      },
      { code: 'stale-relation', slug: ACME, message: 'client → Acme Holding : vu le 2026-01-15' },
      {
        code: 'overdue-commitment',
        slug: 'engagements/devis',
        message: 'échéance dépassée : 2026-10-15 18:00',
      },
      {
        code: 'todo-commitment-mismatch',
        slug: 'engagements/devis',
        message: 'todo t1 faite, engagement ouvert',
      },
      {
        code: 'todo-commitment-mismatch',
        slug: 'engagements/fait',
        message: 'todo t2 ouverte, engagement fait',
      },
    ]);
  });
});
