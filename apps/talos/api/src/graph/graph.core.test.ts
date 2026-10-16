import { describe, expect, it } from 'vitest';
import { projectStoredGraph, type StoredGraphSource } from './graph.core';

const SOURCE: StoredGraphSource = {
  entities: [
    {
      slug: 'second-brain/hugo',
      title: 'Hugo',
      kind: 'moi',
      closeness: 5,
      archived: false,
    },
    {
      slug: 'second-brain/personnes/alice-martin',
      title: 'Alice Martin',
      kind: 'personne',
      closeness: 7,
      archived: false,
    },
    {
      slug: 'second-brain/organisations/acme',
      title: 'Acme',
      kind: 'organisation',
      closeness: null,
      archived: false,
    },
    {
      slug: 'second-brain/personnes/ancien-contact',
      title: 'Ancien contact',
      kind: 'personne',
      closeness: 2,
      archived: true,
    },
  ],
  commitments: [
    {
      slug: 'engagements/2026-10-05-devis-acme',
      action: 'Envoyer le devis',
      body: '# Devis Acme\n',
    },
    { slug: 'engagements/2026-10-06-relance', action: 'Relancer Alice', body: '' },
    { slug: 'engagements/2026-10-07-sans-titre', action: null, body: '' },
  ],
  relations: [
    {
      fromSlug: 'second-brain/personnes/alice-martin',
      verb: 'travaille_chez',
      toSlug: 'second-brain/organisations/acme',
      since: '2026-09',
      until: null,
      seen: '2026-10-02',
    },
    {
      fromSlug: 'second-brain/hugo',
      verb: 'ami_de',
      toSlug: 'second-brain/personnes/alice-martin',
      since: '2027-01-01',
      until: '2027-06-01',
      seen: null,
    },
    {
      fromSlug: 'second-brain/organisations/acme',
      verb: 'client',
      toSlug: 'second-brain/hugo',
      since: null,
      until: null,
      seen: null,
    },
  ],
};

describe('projectStoredGraph', () => {
  it('turns live entities and commitments into nodes and keeps a valid closeness only', () => {
    expect(projectStoredGraph(SOURCE, null).nodes).toEqual([
      { id: 'second-brain/hugo', title: 'Hugo', type: 'moi', proximity: 5 },
      { id: 'second-brain/personnes/alice-martin', title: 'Alice Martin', type: 'personne' },
      { id: 'second-brain/organisations/acme', title: 'Acme', type: 'organisation' },
      { id: 'engagements/2026-10-05-devis-acme', title: 'Devis Acme', type: 'engagement' },
      { id: 'engagements/2026-10-06-relance', title: 'Relancer Alice', type: 'engagement' },
      {
        id: 'engagements/2026-10-07-sans-titre',
        title: '2026-10-07-sans-titre',
        type: 'engagement',
      },
    ]);
  });

  it('reads the relations with the date rule of the git graph', () => {
    expect(projectStoredGraph(SOURCE, '2026-10-16').edges.slice(0, 1)).toEqual([
      {
        source: 'second-brain/personnes/alice-martin',
        target: 'second-brain/organisations/acme',
        relation: 'travaille_chez',
        since: '2026-09',
        seen: '2026-10-02',
        isClosed: false,
      },
    ]);
  });

  it('keeps an undated relation at any date', () => {
    expect(
      projectStoredGraph(SOURCE, '2026-10-16').edges.find((edge) => edge.relation === 'client'),
    ).toEqual({
      source: 'second-brain/organisations/acme',
      target: 'second-brain/hugo',
      relation: 'client',
      isClosed: false,
    });
  });

  it('marks a relation with an end as closed when no date is asked', () => {
    const closed = projectStoredGraph(SOURCE, null).edges.find(
      (edge) => edge.relation === 'ami_de',
    );
    expect(closed).toEqual({
      source: 'second-brain/hugo',
      target: 'second-brain/personnes/alice-martin',
      relation: 'ami_de',
      since: '2027-01-01',
      until: '2027-06-01',
      isClosed: true,
    });
  });
});
