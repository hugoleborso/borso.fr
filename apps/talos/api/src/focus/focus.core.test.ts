import { describe, expect, it } from 'vitest';
import { projectStoredFocus } from './focus.core';

describe('projectStoredFocus', () => {
  it('drops the empty reason and horizon of a stored focus item', () => {
    expect(
      projectStoredFocus({
        updatedOn: '2026-10-05',
        items: [
          { title: "Préparer l'atelier Acme", why: 'la date approche', horizon: '2026-10-09' },
          { title: 'Rappeler Alice Martin', why: null, horizon: null },
        ],
      }),
    ).toEqual({
      updatedOn: '2026-10-05',
      items: [
        { title: "Préparer l'atelier Acme", why: 'la date approche', horizon: '2026-10-09' },
        { title: 'Rappeler Alice Martin' },
      ],
    });
  });
});
