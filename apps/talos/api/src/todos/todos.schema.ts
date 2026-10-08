import { isoDateSchema, todoLineSchema, todoTextSchema } from '@domain/todo.core';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { rejectInvalidInput } from '../helpers/validation/invalid-input.hook';

const TODO_ID_PATTERN = /^[0-9a-f]{10}$/;

// @FollowsBlueprint schema-input-only
export const createTodoSchema = z.object({
  text: todoTextSchema,
  dueDate: isoDateSchema.optional(),
});

export const updateTodoSchema = z.object({
  done: z.boolean().optional(),
  text: todoTextSchema.optional(),
  dueDate: isoDateSchema.nullable().optional(),
});

export const restoreTodoSchema = z.object({
  line: todoLineSchema,
  position: z.number().int().min(0),
});

export const todoIdSchema = z.object({ id: z.string().regex(TODO_ID_PATTERN) });

export const createTodoValidator = zValidator('json', createTodoSchema, rejectInvalidInput);
export const updateTodoValidator = zValidator('json', updateTodoSchema, rejectInvalidInput);
export const restoreTodoValidator = zValidator('json', restoreTodoSchema, rejectInvalidInput);
export const todoIdValidator = zValidator('param', todoIdSchema, rejectInvalidInput);
