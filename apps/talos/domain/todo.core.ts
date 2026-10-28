import { z } from 'zod';
import {
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
const LINE_BREAK = '\n';
const DUE_DATE_KEY = normalizeAttributeKey('échéance');
const COMMITMENT_KEY = normalizeAttributeKey('engagement');
const ADDED_ON_KEY = normalizeAttributeKey('ajouté');
const DONE_ON_KEY = normalizeAttributeKey('fait');
const SOURCE_KEY = normalizeAttributeKey('src');
const MAXIMUM_TODO_LINE_LENGTH = 2000;
const RESTORABLE_LINE_PATTERN = /^- \[[ xX]\] [^\n\r]+$/;

export const isoDateSchema = z.string().regex(ISO_DATE_PATTERN);

export const todoTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAXIMUM_TODO_TEXT_LENGTH)
  .regex(SINGLE_LINE_WITHOUT_SEPARATOR);

export const todoLineSchema = z
  .string()
  .max(MAXIMUM_TODO_LINE_LENGTH)
  .regex(RESTORABLE_LINE_PATTERN);

export const todoSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
  dueDate: isoDateSchema.optional(),
  commitment: z.string().optional(),
  source: z.string().optional(),
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
  const source = readPresentAttribute(line, SOURCE_KEY);
  const addedOn = readPresentAttribute(line, ADDED_ON_KEY);
  const doneOn = readPresentAttribute(line, DONE_ON_KEY);
  return {
    id: buildTodoId(line.text, addedOn),
    text: line.text,
    done: line.isDone,
    ...(dueDate === undefined ? {} : { dueDate }),
    ...(commitment === undefined ? {} : { commitment }),
    ...(source === undefined ? {} : { source }),
    ...(addedOn === undefined ? {} : { addedOn }),
    ...(doneOn === undefined ? {} : { doneOn }),
  };
}

// @FollowsBlueprint core-parse-untrusted
export function parseTodos(markdown: string): Todo[] {
  return readTodoLines(markdown).map(projectTodo);
}
