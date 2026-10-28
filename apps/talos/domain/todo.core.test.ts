import { describe, expect, it } from 'vitest';
import { buildTodoId } from './todo-id.core';
import { parseTodos, todoLineSchema, todoSchema, todoTextSchema } from './todo.core';

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

  it('reads the source of a task, and ignores an empty one', () => {
    expect(
      parseTodos(
        '- [ ] Lire | src: sources/2026/10/02/appel.md | ajouté: 2026-10-01\n- [ ] Vide | src: \n',
      ),
    ).toStrictEqual([
      {
        id: buildTodoId('Lire', '2026-10-01'),
        text: 'Lire',
        done: false,
        source: 'sources/2026/10/02/appel.md',
        addedOn: '2026-10-01',
      },
      { id: buildTodoId('Vide', undefined), text: 'Vide', done: false },
    ]);
  });

  it('answers an empty list for a file without tasks', () => {
    expect(parseTodos('# Todo\n')).toEqual([]);
  });
});

describe('todoLineSchema', () => {
  it('accepts a task line', () => {
    expect(todoLineSchema.safeParse('- [x] Fait | ajouté: 2026-10-01').success).toBe(true);
  });

  it.each([
    ['a line that is not a task', 'texte'],
    ['an empty task', '- [ ] '],
    ['two lines', '- [ ] a\n- [ ] b'],
    ['a line longer than allowed', `- [ ] ${'a'.repeat(2000)}`],
  ])('refuses %s', (_label, candidate) => {
    expect(todoLineSchema.safeParse(candidate).success).toBe(false);
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
