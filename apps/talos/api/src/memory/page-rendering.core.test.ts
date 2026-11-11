import { describe, expect, it } from 'vitest';
import {
  closeRaw,
  composeFactRaw,
  composeRelationRaw,
  type FactLine,
  insertSectionLines,
  type RelationLine,
  renderEntityPage,
  renderFrontMatter,
  renderRecordPage,
} from './page-rendering.core';

const BARE_LINE = {
  since: null,
  until: null,
  seen: null,
  sourceRef: null,
  inferred: false,
  extra: null,
  raw: null,
  position: 0,
};

function fact(overrides: Partial<FactLine>): FactLine {
  return { ...BARE_LINE, section: 'facts', key: null, value: '', ...overrides };
}

function relation(overrides: Partial<RelationLine>): RelationLine {
  return {
    ...BARE_LINE,
    verb: 'ami_de',
    toSlug: 'second-brain/personnes/bruno-petit',
    ...overrides,
  };
}

const ENTITY = {
  kind: 'personne',
  body: '# Alice Martin\n\n## En bref\nCliente Acme.\n\n## Faits\n\n## Historique\n\n## Relations\n\n',
  attributes: {
    alias: ['Alice', 'AM'],
    proximite: '2',
    email: 'alice@acme.test',
    type: 'personne',
  },
  closeness: 3,
  closenessReason: 'cliente active',
};

describe('renderFrontMatter', () => {
  it('writes type first, then the stored order, with the closeness columns in place', () => {
    expect(renderFrontMatter(ENTITY)).toBe(
      [
        '---',
        'type: personne',
        'alias: ["Alice","AM"]',
        'proximite: 3',
        'email: alice@acme.test',
        'proximite_pourquoi: cliente active',
        '---',
      ].join('\n'),
    );
  });

  it('falls back to the kind for the type, keeps stored closeness when the column is empty, and quotes what yaml would misread', () => {
    expect(
      renderFrontMatter({
        kind: 'organisation',
        body: '',
        attributes: {
          proximite: '4',
          ['proximite_pourquoi']: 'client',
          qui: '[[x]]',
          vide: '',
          note: 'a: b',
        },
        closeness: null,
        closenessReason: null,
      }),
    ).toBe(
      '---\ntype: organisation\nproximite: 4\nproximite_pourquoi: client\nqui: "[[x]]"\nvide:\nnote: "a: b"\n---',
    );
  });
});

describe('renderFrontMatter for a page created through the API', () => {
  it('appends the closeness and its reason when the stored attributes lack them', () => {
    expect(
      renderFrontMatter({
        kind: 'projet',
        body: '',
        attributes: { ['proximite_pourquoi']: 'ancien' },
        closeness: 4,
        closenessReason: 'au cœur du trimestre',
      }),
    ).toBe('---\ntype: projet\nproximite_pourquoi: au cœur du trimestre\nproximite: 4\n---');
  });
});

describe('renderFrontMatter without closeness', () => {
  it('writes no closeness line when neither the column nor the attributes hold one', () => {
    expect(
      renderFrontMatter({
        kind: 'concept',
        body: '',
        attributes: {},
        closeness: null,
        closenessReason: null,
      }),
    ).toBe('---\ntype: concept\n---');
  });
});

describe('composing a line from its fields', () => {
  it('writes a fact with every attribute and the inferred mark', () => {
    expect(
      composeFactRaw(
        fact({
          key: 'poste',
          value: 'directrice',
          since: '2026-09',
          until: '2026-10',
          seen: '2026-10-02',
          sourceRef: 'sources/2026/10/02/x',
          extra: 'note: libre',
          inferred: true,
        }),
      ),
    ).toBe(
      "poste: directrice | depuis: 2026-09 | jusqu'à: 2026-10 | vu: 2026-10-02 | src: sources/2026/10/02/x | note: libre (inféré)",
    );
    expect(composeFactRaw(fact({ value: 'Vit à Lyon' }))).toBe('Vit à Lyon');
  });

  it('writes a relation as verb, arrow and wikilink', () => {
    expect(composeRelationRaw(relation({ since: '2026' }))).toBe(
      'ami_de → [[second-brain/personnes/bruno-petit]] | depuis: 2026',
    );
  });
});

describe('closeRaw', () => {
  it('appends the until date, keeping the inferred mark last', () => {
    expect(closeRaw('a | depuis: 2026 (inféré)', '2026-10', null)).toBe(
      "a | depuis: 2026 | jusqu'à: 2026-10 (inféré)",
    );
  });

  it('replaces an earlier until date and appends the note', () => {
    expect(closeRaw("a | jusqu'à: 2025 | vu: 2026-01", '2026-10', 'départ')).toBe(
      "a | vu: 2026-01 | jusqu'à: 2026-10 | départ",
    );
  });
});

describe('insertSectionLines', () => {
  it('finds a heading written with trailing spaces', () => {
    expect(insertSectionLines('## Faits  \n## Suite', 'Faits', ['x'])).toBe(
      '## Faits  \n- x\n## Suite',
    );
  });

  it('puts the lines after the heading and its blank line', () => {
    expect(insertSectionLines('## Faits\n\n## Suite', 'Faits', ['x'])).toBe(
      '## Faits\n\n- x\n## Suite',
    );
    expect(insertSectionLines('## Faits\n## Suite', 'Faits', ['x'])).toBe(
      '## Faits\n- x\n## Suite',
    );
  });

  it('appends the heading when the body has none, and leaves the body alone without lines', () => {
    expect(insertSectionLines('# Titre', 'Relations', ['y'])).toBe(
      '# Titre\n\n## Relations\n\n- y\n',
    );
    expect(insertSectionLines('', 'Relations', ['y'])).toBe('\n## Relations\n\n- y\n');
    expect(insertSectionLines('# Titre\n', 'Relations', ['y'])).toBe(
      '# Titre\n\n## Relations\n\n- y\n',
    );
    expect(insertSectionLines('# Titre', 'Relations', [])).toBe('# Titre');
  });
});

const EMPTY_SECTION = { heading: 'Vide', lines: [] };

describe('renderEntityPage', () => {
  it('rebuilds the file: facts, history and relations in position order, raw first', () => {
    const markdown = renderEntityPage(
      ENTITY,
      [
        fact({ value: 'Lyon', position: 1 }),
        fact({ raw: 'travaille chez Acme', position: 0 }),
        fact({ section: 'history', value: 'Paris', until: '2025' }),
      ],
      [
        relation({ position: 1, raw: 'client → [[second-brain/organisations/acme]]' }),
        relation({ position: 0 }),
      ],
    );
    expect(markdown).toContain(
      "## Faits\n\n- travaille chez Acme\n- Lyon\n## Historique\n\n- Paris | jusqu'à: 2025\n## Relations\n\n- ami_de → [[second-brain/personnes/bruno-petit]]\n- client → [[second-brain/organisations/acme]]\n",
    );
    expect(markdown.startsWith('---\ntype: personne\n')).toBe(true);
  });

  it('places each computed section under its heading of the body, else at the end, in the order given', () => {
    const computed = [
      { heading: 'Comprend', lines: ['[[second-brain/projets/potager]]'] },
      {
        heading: 'Faits récents',
        lines: ['2026-11-02 | [[second-brain/projets/potager]] | semis'],
      },
      { heading: 'Vide', lines: [] },
    ];
    const appended = renderEntityPage(
      { ...ENTITY, body: '# Jardin\n\n## Relations\n' },
      [],
      [relation({})],
      computed.slice(0, 2),
    );
    expect(
      appended.endsWith(
        '# Jardin\n\n## Relations\n\n- ami_de → [[second-brain/personnes/bruno-petit]]\n\n## Comprend\n\n- [[second-brain/projets/potager]]\n\n## Faits récents\n\n- 2026-11-02 | [[second-brain/projets/potager]] | semis\n',
      ),
    ).toBe(true);
    const placed = renderEntityPage(
      { ...ENTITY, body: '# Jardin\n\n## Faits récents\n\n## Comprend  \n\n## Chronologie\n' },
      [],
      [],
      computed,
    );
    expect(
      placed.endsWith(
        '# Jardin\n\n## Faits récents\n\n- 2026-11-02 | [[second-brain/projets/potager]] | semis\n## Comprend  \n\n- [[second-brain/projets/potager]]\n## Chronologie\n',
      ),
    ).toBe(true);
  });

  it('puts a computed section whose heading the body lacks before the heading of a later one', () => {
    const contained = { heading: 'Comprend', lines: ['[[second-brain/projets/potager]]'] };
    const recent = { heading: 'Faits récents', lines: ['2026-11-02 | semis'] };
    const body = '# Jardin\n\n## Faits récents  \n\n## Chronologie\n';
    expect(
      renderEntityPage({ ...ENTITY, body }, [], [], [contained, recent, EMPTY_SECTION]).endsWith(
        '# Jardin\n\n## Comprend\n\n- [[second-brain/projets/potager]]\n\n## Faits récents  \n\n- 2026-11-02 | semis\n## Chronologie\n',
      ),
    ).toBe(true);
    expect(
      renderEntityPage({ ...ENTITY, body }, [], [], [{ ...contained, lines: [] }, recent]).endsWith(
        '# Jardin\n\n## Faits récents  \n\n- 2026-11-02 | semis\n## Chronologie\n',
      ),
    ).toBe(true);
  });
});

describe('renderRecordPage', () => {
  it('writes the stored attributes in order above the body', () => {
    expect(
      renderRecordPage(
        Object.fromEntries([
          ['type', 'engagement'],
          ['statut', 'ouvert'],
        ]),
        '# Devis Acme',
      ),
    ).toBe('---\ntype: engagement\nstatut: ouvert\n---\n# Devis Acme');
  });
});
