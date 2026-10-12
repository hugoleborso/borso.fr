import { describe, expect, it } from 'vitest';
import { focusItemSchema, focusItemsSchema, parseFocus, serializeFocus } from './focus.core';

const FOCUS_FILE = [
  '---',
  'maj: 2026-10-04',
  '---',
  '# Focus du moment',
  '',
  '- **Acme** — appel lundi 15 h | horizon: 2026-10-05',
  '- **Séville** – congé posé',
  '- **Objectifs du trimestre** | pourquoi: demandés par Sophie | horizon: 2026-10-15',
  '- **Sans rien**',
  '- **Tiret collé**-pas un pourquoi',
  '   - ** Indenté ** | horizon: 2026-11-01',
  'Une ligne qui ne compte pas',
].join('\n');

describe('parseFocus', () => {
  it('reads the date and each item with its optional why and horizon', () => {
    expect(parseFocus(FOCUS_FILE)).toStrictEqual({
      updatedOn: '2026-10-04',
      items: [
        { title: 'Acme', why: 'appel lundi 15 h', horizon: '2026-10-05' },
        { title: 'Séville', why: 'congé posé' },
        { title: 'Objectifs du trimestre', why: 'demandés par Sophie', horizon: '2026-10-15' },
        { title: 'Sans rien' },
        { title: 'Tiret collé' },
        { title: 'Indenté', horizon: '2026-11-01' },
      ],
    });
  });

  it('prefers the inline why over the attribute', () => {
    expect(parseFocus('- **A** - en ligne | pourquoi: attribut').items).toStrictEqual([
      { title: 'A', why: 'en ligne' },
    ]);
  });

  it('answers a null date when the file has no front matter', () => {
    expect(parseFocus('# Focus du moment\n').updatedOn).toBeNull();
  });
});

describe('serializeFocus', () => {
  it('writes the file format that parseFocus reads back', () => {
    const focusItems = [
      { title: 'Acme', why: 'appel lundi', horizon: '2026-10-05' },
      { title: 'Séville' },
    ];
    const markdown = serializeFocus('2026-10-05', focusItems);
    expect(markdown).toBe(
      [
        '---',
        'maj: 2026-10-05',
        '---',
        '# Focus du moment',
        '',
        '- **Acme** — appel lundi | horizon: 2026-10-05',
        '- **Séville**',
        '',
      ].join('\n'),
    );
    expect(parseFocus(markdown)).toEqual({ updatedOn: '2026-10-05', items: focusItems });
  });
});

describe('focusItemSchema', () => {
  it('trims the texts it accepts', () => {
    expect(focusItemSchema.parse({ title: ' Acme ', why: ' vite ' })).toEqual({
      title: 'Acme',
      why: 'vite',
    });
  });

  it.each([
    ['an empty title', { title: '  ' }],
    ['a title carrying bold markers', { title: 'a **b**' }],
    ['a separator the file format reserves', { title: 'a | b' }],
    ['a line break', { title: 'a', why: 'b\nc' }],
    ['a horizon that is not a date', { title: 'a', horizon: 'demain' }],
    ['a text longer than a line should be', { title: 'a'.repeat(301) }],
  ])('refuses %s', (_label, candidate) => {
    expect(focusItemSchema.safeParse(candidate).success).toBe(false);
  });

  it('accepts a text exactly as long as allowed', () => {
    expect(focusItemSchema.safeParse({ title: 'a'.repeat(300) }).success).toBe(true);
  });
});

describe('focusItemsSchema', () => {
  it('accepts three items and refuses a fourth', () => {
    const acme = { title: 'a' };
    expect(focusItemsSchema.safeParse([acme, acme, acme]).success).toBe(true);
    expect(focusItemsSchema.safeParse([acme, acme, acme, acme]).success).toBe(false);
  });
});
