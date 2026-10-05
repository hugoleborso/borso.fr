import { buildTodoId } from '@domain/todo-id.core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { CONTENT_FIXTURE } from '../../../test/content-fixture';
import { truncateAllTables } from '../../../test/database-utils';

const CV_ID = buildTodoId('Envoyer le CV', '2026-10-04');

beforeEach(async () => {
  await truncateAllTables();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-05T08:00:00Z'));
  return () => {
    vi.useRealTimers();
  };
});

// @FollowsBlueprint test-back-e2e
describe('the todo routes', () => {
  it('lists every task of todo.md', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/todos', { cookie: await signIn() });
    const body: { items: { text: string }[] } = await response.json();
    expect(body.items.map((todo) => todo.text)).toEqual([
      'Envoyer le CV',
      'Préparer le COPIL',
      'Payer le loyer',
      'Clore les fils',
    ]);
  });

  it('adds a task dated today and commits it', async () => {
    const { app, overlay } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/todos', {
      method: 'POST',
      body: { text: 'Rappeler Julie', dueDate: '2026-10-09' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: buildTodoId('Rappeler Julie', '2026-10-05'),
      text: 'Rappeler Julie',
      done: false,
      dueDate: '2026-10-09',
      addedOn: '2026-10-05',
    });
    expect(overlay.get('todo.md')).toContain(
      '- [ ] Rappeler Julie | échéance: 2026-10-09 | ajouté: 2026-10-05',
    );
  });

  it('refuses the same task twice on the same day', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const cookie = await signIn();
    await requestJson(app, '/api/todos', { method: 'POST', body: { text: 'Doublon' }, cookie });
    const response = await requestJson(app, '/api/todos', {
      method: 'POST',
      body: { text: 'Doublon' },
      cookie,
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Cette tâche existe déjà.' });
  });

  it('checks a task', async () => {
    const { app, overlay } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, `/api/todos/${CV_ID}`, {
      method: 'PATCH',
      body: { done: true },
      cookie: await signIn(),
    });
    expect(await response.json()).toMatchObject({ id: CV_ID, done: true, doneOn: '2026-10-05' });
    expect(overlay.get('todo.md')).toContain('| fait: 2026-10-05');
  });

  it('answers 404 for an unknown task', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/todos/0000000000', {
      method: 'PATCH',
      body: { done: true },
      cookie: await signIn(),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Tâche introuvable.' });
  });

  it('refuses an identifier that is not one', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/todos/pas-un-id', {
      method: 'PATCH',
      body: { done: true },
      cookie: await signIn(),
    });
    expect(response.status).toBe(400);
  });
});
