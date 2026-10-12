import { describe, expect, it } from 'vitest';
import { selectErrorResponse } from './error-response.core';
import { TalosError } from './talos-error.types';

describe('selectErrorResponse', () => {
  it('answers the French message and the status of a named refusal', () => {
    expect(selectErrorResponse(new TalosError('todo-not-found'))).toEqual({
      body: { error: 'Tâche introuvable.' },
      status: 404,
    });
  });

  it('hides the message of any other failure behind an unexpected error', () => {
    expect(selectErrorResponse(new Error('connection refused to 10.0.0.1'))).toEqual({
      body: { error: 'Erreur inattendue.' },
      status: 500,
    });
  });
});

describe('selectErrorResponse for a framework refusal', () => {
  it('answers a malformed request as invalid input', () => {
    expect(selectErrorResponse({ status: 400, message: 'Malformed JSON in request body' })).toEqual(
      {
        body: { error: 'Requête invalide.' },
        status: 400,
      },
    );
    expect(selectErrorResponse({ status: 499 }).status).toBe(400);
  });

  it('keeps a server-side status hidden', () => {
    expect(selectErrorResponse({ status: 503 }).status).toBe(500);
    expect(selectErrorResponse({ status: 399 }).status).toBe(500);
    expect(selectErrorResponse({ status: 400.5 }).status).toBe(500);
  });
});
