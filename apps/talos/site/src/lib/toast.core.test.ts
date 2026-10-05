import { describe, expect, it } from 'vitest';
import { buildFailureToast, selectToastDuration } from './toast.core';

describe('selectToastDuration', () => {
  it('lets a confirmation go after four seconds', () => {
    expect(selectToastDuration('neutral')).toBe(4000);
    expect(selectToastDuration('success')).toBe(4000);
    expect(selectToastDuration('info')).toBe(4000);
  });

  it('keeps a failure on screen until the owner closes it', () => {
    expect(selectToastDuration('danger')).toBeNull();
  });
});

describe('buildFailureToast', () => {
  const fallback = "La todo n'a pas pu être enregistrée.";

  it('shows the French message the API answered', () => {
    expect(buildFailureToast({ body: { error: 'Cette tâche existe déjà.' } }, fallback)).toEqual({
      tone: 'danger',
      message: 'Cette tâche existe déjà.',
    });
  });

  it('falls back to the screen message when the API said nothing usable', () => {
    for (const failure of [
      null,
      'texte',
      new Error('réseau'),
      { body: null },
      { body: 'texte' },
      { body: {} },
      { body: { error: 42 } },
      { body: { error: ['Cette tâche existe déjà.'] } },
      { body: { error: '' } },
    ]) {
      expect(buildFailureToast(failure, fallback)).toEqual({ tone: 'danger', message: fallback });
    }
  });
});
