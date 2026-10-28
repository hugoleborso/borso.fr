import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { readMemoryEvents, seedMemoryInDatabase } from '../../../test/memory-fixture';

beforeEach(async () => {
  await truncateAllTables();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-05T08:00:00Z'));
  return () => {
    vi.useRealTimers();
  };
});

const STORED_ID = 'a1b2c3d4e5';
const STORED_UUID = '0f3c2a1b-4d5e-4f60-8a7b-9c0d1e2f3a4b';

// @FollowsBlueprint test-back-e2e
describe('the todo routes', () => {
  beforeEach(async () => {
    await seedMemoryInDatabase();
  });

  it('lists the stored todos with their ids, the work list apart', async () => {
    const { app } = buildTestContext();
    const cookie = await signIn();
    const personal: { items: unknown[] } = await (
      await requestJson(app, '/api/todos', { cookie })
    ).json();
    expect(personal.items[0]).toEqual({
      id: STORED_ID,
      text: 'Envoyer le devis à Acme',
      done: false,
      dueDate: '2026-10-07',
      commitment: 'engagements/2026-10-07-devis-acme',
      addedOn: '2026-10-04',
    });
    const work: { items: { text: string }[] } = await (
      await requestJson(app, '/api/work-todos', { cookie })
    ).json();
    expect(work.items.map((todo) => todo.text)).toEqual(['Relire la recette Acme']);
  });

  it('adds, checks and edits a todo as the PWA, with one event each', async () => {
    const { app } = buildTestContext();
    const cookie = await signIn();
    const created = await requestJson(app, '/api/todos', {
      method: 'POST',
      body: { text: 'Réserver la salle', dueDate: '2026-10-09' },
      cookie,
    });
    expect(created.status).toBe(201);
    const todo: { id: string; addedOn: string } = await created.json();
    expect(todo.addedOn).toBe('2026-10-05');
    const duplicate = await requestJson(app, '/api/todos', {
      method: 'POST',
      body: { text: 'Réserver la salle' },
      cookie,
    });
    expect(duplicate.status).toBe(409);
    const checked = await requestJson(app, `/api/todos/${STORED_UUID}`, {
      method: 'PATCH',
      body: { done: true, dueDate: null },
      cookie,
    });
    expect(await checked.json()).toMatchObject({
      id: STORED_UUID,
      done: true,
      doneOn: '2026-10-05',
    });
    const pwaEvents = (await readMemoryEvents()).filter((event) => event.actor === 'pwa');
    expect(pwaEvents.map((event) => event.operation)).toEqual(['todo.add', 'todo.update']);
  });

  it('removes a todo with its line and position, then puts it back where it was', async () => {
    const { app } = buildTestContext();
    const cookie = await signIn();
    const removed = await requestJson(app, `/api/todos/${STORED_ID}`, { method: 'DELETE', cookie });
    const removal: { line: string; position: number } = await removed.json();
    expect(removal).toMatchObject({
      line: '- [ ] Envoyer le devis à Acme | échéance: 2026-10-07 | engagement: engagements/2026-10-07-devis-acme | ajouté: 2026-10-04 | priorite: haute',
      position: 0,
    });
    const remaining: { items: { id: string }[] } = await (
      await requestJson(app, '/api/todos', { cookie })
    ).json();
    expect(remaining.items.map((todo) => todo.id)).toEqual([STORED_UUID]);
    const restored = await requestJson(app, '/api/todos/restorations', {
      method: 'POST',
      body: removal,
      cookie,
    });
    expect(restored.status).toBe(201);
    expect(await restored.json()).toMatchObject({ id: STORED_ID });
    const again = await requestJson(app, '/api/todos/restorations', {
      method: 'POST',
      body: removal,
      cookie,
    });
    expect(again.status).toBe(409);
    const listed: { items: { id: string }[] } = await (
      await requestJson(app, '/api/todos', { cookie })
    ).json();
    expect(listed.items.map((todo) => todo.id)).toEqual([STORED_ID, STORED_UUID]);
  });

  it('restores a line the memory never held as a new todo', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/work-todos/restorations', {
      method: 'POST',
      body: { line: '- [ ] Appeler Acme | ajouté: 2026-10-03', position: 0 },
      cookie: await signIn(),
    });
    expect(await response.json()).toMatchObject({ text: 'Appeler Acme', addedOn: '2026-10-03' });
  });

  it('answers 404 for a todo of the other list', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, `/api/work-todos/${STORED_ID}`, {
      method: 'PATCH',
      body: { done: true },
      cookie: await signIn(),
    });
    expect(response.status).toBe(404);
  });

  it('answers 404 for an unknown task', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/todos/0000000000', {
      method: 'PATCH',
      body: { done: true },
      cookie: await signIn(),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Tâche introuvable.' });
  });

  it('refuses an identifier that is not one', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/todos/pas-un-id', {
      method: 'PATCH',
      body: { done: true },
      cookie: await signIn(),
    });
    expect(response.status).toBe(400);
  });

  it('answers 404 when deleting an unknown task, and 400 for a line that is not one', async () => {
    const { app } = buildTestContext();
    const cookie = await signIn();
    const deletion = await requestJson(app, '/api/todos/0000000000', { method: 'DELETE', cookie });
    expect(deletion.status).toBe(404);
    const restoration = await requestJson(app, '/api/todos/restorations', {
      method: 'POST',
      body: { line: '# Todo', position: 0 },
      cookie,
    });
    expect(restoration.status).toBe(400);
  });
});
