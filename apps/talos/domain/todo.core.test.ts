import { describe, expect, it } from 'vitest';
import { buildTodoId } from './todo-id.core';
import { appendTodo, parseTodos, todoSchema, todoTextSchema, updateTodo } from './todo.core';

const TODAY = '2026-10-05';

const TODO_FILE = [
  '# Todo',
  '',
  '- [ ] Envoyer le CV | échéance: 2026-10-05 | engagement: engagements/acme | ajouté: 2026-10-04',
  '- [x] Payer le loyer | échéance: 2026-10-05 | ajouté: 2026-10-04 | fait: 2026-10-05',
  '- [X] Majuscule | ajouté: 2026-10-01',
  '- [ ] Clore les fils | échéance: statut: | urgent | ajouté: 2026-10-04 | engagement:',
  '- [ ] Sans date',
  '- pas une tâche',
  '',
  'Notes en bas.',
  '',
].join('\n');

const CV_ID = buildTodoId('Envoyer le CV', '2026-10-04');
const RENT_ID = buildTodoId('Payer le loyer', '2026-10-04');
const CLORE_ID = buildTodoId('Clore les fils', '2026-10-04');

function savedMarkdown(edit: ReturnType<typeof updateTodo>): string {
  if (edit.kind !== 'saved') throw new Error(`expected a saved edit, got ${edit.kind}`);
  return edit.markdown;
}

describe('parseTodos', () => {
  it('reads every task line with its attributes and identifier', () => {
    expect(parseTodos(TODO_FILE)).toStrictEqual([
      {
        id: CV_ID,
        text: 'Envoyer le CV',
        done: false,
        dueDate: '2026-10-05',
        commitment: 'engagements/acme',
        addedOn: '2026-10-04',
      },
      {
        id: RENT_ID,
        text: 'Payer le loyer',
        done: true,
        dueDate: '2026-10-05',
        addedOn: '2026-10-04',
        doneOn: '2026-10-05',
      },
      {
        id: buildTodoId('Majuscule', '2026-10-01'),
        text: 'Majuscule',
        done: true,
        addedOn: '2026-10-01',
      },
      { id: CLORE_ID, text: 'Clore les fils', done: false, addedOn: '2026-10-04' },
      { id: buildTodoId('Sans date', undefined), text: 'Sans date', done: false },
    ]);
  });

  it('reads a line ending with a windows line break', () => {
    expect(parseTodos('- [ ] Texte | ajouté: 2026-10-01\r\n')).toStrictEqual([
      { id: buildTodoId('Texte', '2026-10-01'), text: 'Texte', done: false, addedOn: '2026-10-01' },
    ]);
  });

  it('answers an empty list for a file without tasks', () => {
    expect(parseTodos('# Todo\n')).toEqual([]);
  });
});

describe('updateTodo', () => {
  it('checks a task, dates it, and leaves every other line byte for byte', () => {
    const edit = updateTodo(TODO_FILE, CV_ID, { done: true }, TODAY);
    expect(edit).toMatchObject({ kind: 'saved', todo: { id: CV_ID, done: true, doneOn: TODAY } });
    const lines = savedMarkdown(edit).split('\n');
    expect(lines[2]).toBe(
      '- [x] Envoyer le CV | échéance: 2026-10-05 | engagement: engagements/acme | ajouté: 2026-10-04 | fait: 2026-10-05',
    );
    expect(lines.filter((_, index) => index !== 2)).toEqual(
      TODO_FILE.split('\n').filter((_, index) => index !== 2),
    );
  });

  it('keeps the original done date when a done task is checked again', () => {
    const edit = updateTodo(TODO_FILE, RENT_ID, { done: true }, '2026-10-09');
    expect(savedMarkdown(edit)).toBe(TODO_FILE);
  });

  it('unchecks a task and drops its done date', () => {
    const edit = updateTodo(TODO_FILE, RENT_ID, { done: false }, TODAY);
    expect(savedMarkdown(edit).split('\n')[3]).toBe(
      '- [ ] Payer le loyer | échéance: 2026-10-05 | ajouté: 2026-10-04',
    );
  });

  it('replaces an unreadable due date and keeps unknown attributes as they were', () => {
    const edit = updateTodo(TODO_FILE, CLORE_ID, { dueDate: '2026-10-20' }, TODAY);
    expect(savedMarkdown(edit).split('\n')[5]).toBe(
      '- [ ] Clore les fils | échéance: 2026-10-20 | urgent | ajouté: 2026-10-04 | engagement:',
    );
  });

  it('adds a due date to a task without one', () => {
    const edit = updateTodo(
      TODO_FILE,
      buildTodoId('Majuscule', '2026-10-01'),
      {
        dueDate: '2026-10-07',
      },
      TODAY,
    );
    expect(savedMarkdown(edit).split('\n')[4]).toBe(
      '- [x] Majuscule | ajouté: 2026-10-01 | échéance: 2026-10-07',
    );
  });

  it('removes the due date when asked with null', () => {
    const edit = updateTodo(TODO_FILE, CV_ID, { dueDate: null }, TODAY);
    expect(savedMarkdown(edit).split('\n')[2]).toBe(
      '- [ ] Envoyer le CV | engagement: engagements/acme | ajouté: 2026-10-04',
    );
  });

  it('renames a task, which gives it a new identifier', () => {
    const edit = updateTodo(TODO_FILE, CV_ID, { text: 'Envoyer le CV à Bruno' }, TODAY);
    expect(edit).toMatchObject({
      kind: 'saved',
      todo: {
        id: buildTodoId('Envoyer le CV à Bruno', '2026-10-04'),
        text: 'Envoyer le CV à Bruno',
      },
    });
  });

  it('leaves the line unchanged when nothing is asked', () => {
    expect(savedMarkdown(updateTodo(TODO_FILE, CV_ID, {}, TODAY))).toBe(TODO_FILE);
  });

  it('answers not-found for an unknown identifier', () => {
    expect(updateTodo(TODO_FILE, '0000000000', { done: true }, TODAY)).toEqual({
      kind: 'not-found',
    });
  });

  it('refuses a rename that would collide with another task', () => {
    expect(updateTodo(TODO_FILE, CV_ID, { text: 'Payer le loyer' }, TODAY)).toEqual({
      kind: 'duplicate',
    });
  });
});

describe('appendTodo', () => {
  it('inserts the task after the last task line, dated today', () => {
    const edit = appendTodo(TODO_FILE, { text: 'Rappeler Julie', dueDate: '2026-10-09' }, TODAY);
    expect(edit).toMatchObject({
      kind: 'saved',
      todo: {
        id: buildTodoId('Rappeler Julie', TODAY),
        text: 'Rappeler Julie',
        done: false,
        dueDate: '2026-10-09',
        addedOn: TODAY,
      },
    });
    const lines = savedMarkdown(edit).split('\n');
    expect(lines[7]).toBe('- [ ] Rappeler Julie | échéance: 2026-10-09 | ajouté: 2026-10-05');
    expect(lines.slice(8)).toEqual(TODO_FILE.split('\n').slice(7));
  });

  it('creates the list under the heading when the file holds no task yet', () => {
    expect(savedMarkdown(appendTodo('# Todo\n\n', { text: 'Premier' }, TODAY))).toBe(
      '# Todo\n\n- [ ] Premier | ajouté: 2026-10-05\n',
    );
  });

  it('keeps the existing introduction of a file without tasks', () => {
    expect(savedMarkdown(appendTodo('# Mes tâches\n\nIntro\n', { text: 'Premier' }, TODAY))).toBe(
      '# Mes tâches\n\nIntro\n\n- [ ] Premier | ajouté: 2026-10-05\n',
    );
  });

  it('refuses a task identical to the first line of the file', () => {
    const markdown = '- [ ] Premier | ajouté: 2026-10-05\n';
    expect(appendTodo(markdown, { text: 'Premier' }, TODAY)).toEqual({ kind: 'duplicate' });
  });

  it('writes the heading when the file is empty', () => {
    expect(savedMarkdown(appendTodo('  ', { text: 'Premier' }, TODAY))).toBe(
      '# Todo\n\n- [ ] Premier | ajouté: 2026-10-05\n',
    );
  });

  it('refuses a task identical to one already added today', () => {
    const today = appendTodo(TODO_FILE, { text: 'Rappeler Julie' }, TODAY);
    expect(appendTodo(savedMarkdown(today), { text: 'Rappeler Julie' }, TODAY)).toEqual({
      kind: 'duplicate',
    });
  });
});

describe('todoTextSchema', () => {
  it('trims a task text', () => {
    expect(todoTextSchema.parse('  Rappeler Julie ')).toBe('Rappeler Julie');
  });

  it.each([
    ['an empty text', ' '],
    ['the attribute separator', 'a | b'],
    ['a line break', 'a\nb'],
    ['a text longer than a line should be', 'a'.repeat(501)],
  ])('refuses %s', (_label, candidate) => {
    expect(todoTextSchema.safeParse(candidate).success).toBe(false);
  });

  it('accepts a text exactly as long as allowed', () => {
    expect(todoTextSchema.safeParse('a'.repeat(500)).success).toBe(true);
  });
});

describe('todoSchema', () => {
  it('refuses a due date that is not a calendar date', () => {
    expect(
      todoSchema.safeParse({ id: 'a', text: 'b', done: false, dueDate: 'demain' }).success,
    ).toBe(false);
  });
});
