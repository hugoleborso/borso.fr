import { z } from 'zod';
import {
  formatLineAttribute,
  type LineAttribute,
  normalizeAttributeKey,
  readLineAttribute,
} from './line-attributes.core';
import { readCapture, splitHeadFromRest } from './text.core';
import { buildTodoId } from './todo-id.core';

const MAXIMUM_TODO_TEXT_LENGTH = 500;
const TODO_LINE_PATTERN = /^- \[(?<checkbox>[ xX])\] (?<rest>.*)$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SINGLE_LINE_WITHOUT_SEPARATOR = /^[^|\n\r]*$/;
const ATTRIBUTE_SEPARATOR = ' | ';
const LINE_BREAK = '\n';
const EMPTY_TODO_FILE = '# Todo';
const TRAILING_BREAKS_PATTERN = /\n*$/;
const DUE_DATE_KEY = normalizeAttributeKey('échéance');
const COMMITMENT_KEY = normalizeAttributeKey('engagement');
const ADDED_ON_KEY = normalizeAttributeKey('ajouté');
const DONE_ON_KEY = normalizeAttributeKey('fait');

export const isoDateSchema = z.string().regex(ISO_DATE_PATTERN);

export const todoTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAXIMUM_TODO_TEXT_LENGTH)
  .regex(SINGLE_LINE_WITHOUT_SEPARATOR);

export const todoSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
  dueDate: isoDateSchema.optional(),
  commitment: z.string().optional(),
  addedOn: z.string().optional(),
  doneOn: z.string().optional(),
});

export type Todo = z.infer<typeof todoSchema>;

export interface TodoChanges {
  readonly done?: boolean | undefined;
  readonly text?: string | undefined;
  readonly dueDate?: string | null | undefined;
}

export interface NewTodo {
  readonly text: string;
  readonly dueDate?: string | undefined;
}

export type TodoEdit =
  | { readonly kind: 'saved'; readonly markdown: string; readonly todo: Todo }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'duplicate' };

interface TodoLine {
  readonly lineIndex: number;
  readonly isDone: boolean;
  readonly text: string;
  readonly attributes: readonly LineAttribute[];
}

function readTodoLine(line: string, lineIndex: number): TodoLine | null {
  const match = TODO_LINE_PATTERN.exec(line.trimEnd());
  if (match === null) return null;
  const { head: text, rest: segments } = splitHeadFromRest(readCapture(match, 'rest'), '|');
  return {
    lineIndex,
    isDone: readCapture(match, 'checkbox') !== ' ',
    text: text.trim(),
    attributes: segments.map(readLineAttribute),
  };
}

function readTodoLines(markdown: string): TodoLine[] {
  return markdown
    .split(LINE_BREAK)
    .map(readTodoLine)
    .filter((line) => line !== null);
}

function readAttribute(line: TodoLine, key: string): string | undefined {
  return line.attributes.find((attribute) => attribute.key === key)?.value;
}

function readPresentAttribute(line: TodoLine, key: string): string | undefined {
  const value = readAttribute(line, key);
  return value === '' ? undefined : value;
}

function readDueDate(line: TodoLine): string | undefined {
  return line.attributes.find(
    (attribute) => attribute.key === DUE_DATE_KEY && ISO_DATE_PATTERN.test(attribute.value),
  )?.value;
}

function projectTodo(line: TodoLine): Todo {
  const dueDate = readDueDate(line);
  const commitment = readPresentAttribute(line, COMMITMENT_KEY);
  const addedOn = readPresentAttribute(line, ADDED_ON_KEY);
  const doneOn = readPresentAttribute(line, DONE_ON_KEY);
  return {
    id: buildTodoId(line.text, addedOn),
    text: line.text,
    done: line.isDone,
    ...(dueDate === undefined ? {} : { dueDate }),
    ...(commitment === undefined ? {} : { commitment }),
    ...(addedOn === undefined ? {} : { addedOn }),
    ...(doneOn === undefined ? {} : { doneOn }),
  };
}

// @FollowsBlueprint core-parse-untrusted
export function parseTodos(markdown: string): Todo[] {
  return readTodoLines(markdown).map(projectTodo);
}

function setAttribute(
  attributes: readonly LineAttribute[],
  key: string,
  value: string,
): LineAttribute[] {
  const replacement = { key, value, raw: formatLineAttribute(key, value) };
  const hasKey = attributes.some((attribute) => attribute.key === key);
  return hasKey
    ? attributes.map((attribute) => (attribute.key === key ? replacement : attribute))
    : [...attributes, replacement];
}

function removeAttribute(attributes: readonly LineAttribute[], key: string): LineAttribute[] {
  return attributes.filter((attribute) => attribute.key !== key);
}

function applyDone(line: TodoLine, done: boolean | undefined, today: string): TodoLine {
  if (done === undefined || done === line.isDone) return line;
  const attributes = done
    ? setAttribute(line.attributes, DONE_ON_KEY, today)
    : removeAttribute(line.attributes, DONE_ON_KEY);
  return { ...line, isDone: done, attributes };
}

function applyDueDate(line: TodoLine, dueDate: string | null | undefined): TodoLine {
  if (dueDate === undefined) return line;
  const attributes =
    dueDate === null
      ? removeAttribute(line.attributes, DUE_DATE_KEY)
      : setAttribute(line.attributes, DUE_DATE_KEY, dueDate);
  return { ...line, attributes };
}

function formatTodoLine(line: TodoLine): string {
  const checkbox = line.isDone ? 'x' : ' ';
  const attributes = line.attributes.map((attribute) => `${ATTRIBUTE_SEPARATOR}${attribute.raw}`);
  return `- [${checkbox}] ${line.text}${attributes.join('')}`;
}

function replaceLine(markdown: string, lineIndex: number, replacement: string): string {
  return markdown
    .split(LINE_BREAK)
    .map((line, index) => (index === lineIndex ? replacement : line))
    .join(LINE_BREAK);
}

function isIdTaken(lines: readonly TodoLine[], id: string): boolean {
  return lines.some((line) => projectTodo(line).id === id);
}

function isIdTakenByAnotherLine(
  lines: readonly TodoLine[],
  id: string,
  ownLineIndex: number,
): boolean {
  return lines.some((line) => line.lineIndex !== ownLineIndex && projectTodo(line).id === id);
}

// @FollowsBlueprint core-decision
export function updateTodo(
  markdown: string,
  id: string,
  changes: TodoChanges,
  today: string,
): TodoEdit {
  const lines = readTodoLines(markdown);
  const target = lines.find((line) => projectTodo(line).id === id);
  if (target === undefined) return { kind: 'not-found' };
  const renamed = { ...target, text: changes.text ?? target.text };
  const updated = applyDueDate(applyDone(renamed, changes.done, today), changes.dueDate);
  const todo = projectTodo(updated);
  if (isIdTakenByAnotherLine(lines, todo.id, target.lineIndex)) return { kind: 'duplicate' };
  return {
    kind: 'saved',
    markdown: replaceLine(markdown, target.lineIndex, formatTodoLine(updated)),
    todo,
  };
}

function insertLineAfter(markdown: string, lineIndex: number | undefined, line: string): string {
  if (lineIndex === undefined) {
    const base = markdown.trim() === '' ? EMPTY_TODO_FILE : markdown;
    return `${base.replace(TRAILING_BREAKS_PATTERN, '')}${LINE_BREAK}${LINE_BREAK}${line}${LINE_BREAK}`;
  }
  const lines = markdown.split(LINE_BREAK);
  return [...lines.slice(0, lineIndex + 1), line, ...lines.slice(lineIndex + 1)].join(LINE_BREAK);
}

export function appendTodo(markdown: string, newTodo: NewTodo, today: string): TodoEdit {
  const lines = readTodoLines(markdown);
  const dueDateAttributes =
    newTodo.dueDate === undefined ? [] : setAttribute([], DUE_DATE_KEY, newTodo.dueDate);
  const line: TodoLine = {
    lineIndex: lines.length,
    isDone: false,
    text: newTodo.text,
    attributes: setAttribute(dueDateAttributes, ADDED_ON_KEY, today),
  };
  const todo = projectTodo(line);
  if (isIdTaken(lines, todo.id)) return { kind: 'duplicate' };
  return {
    kind: 'saved',
    markdown: insertLineAfter(markdown, lines.at(-1)?.lineIndex, formatTodoLine(line)),
    todo,
  };
}
