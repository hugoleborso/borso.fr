import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import {
  createTodoValidator,
  restoreTodoValidator,
  todoIdValidator,
  updateTodoValidator,
} from './todos.schema';
import { addTodo, changeTodo, deleteTodo, listTodos, reinstateTodo } from './todos.service';

// @FollowsBlueprint controller-guarded-router
export function buildTodosRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/', async (context) => context.json({ items: await listTodos() }))
    .post('/', createTodoValidator, async (context) =>
      context.json(await addTodo(context.req.valid('json'), new Date()), 201),
    )
    .post('/restorations', restoreTodoValidator, async (context) =>
      context.json(await reinstateTodo(context.req.valid('json')), 201),
    )
    .delete('/:id', todoIdValidator, async (context) =>
      context.json(await deleteTodo(context.req.valid('param').id)),
    )
    .patch('/:id', todoIdValidator, updateTodoValidator, async (context) =>
      context.json(
        await changeTodo(context.req.valid('param').id, context.req.valid('json'), new Date()),
      ),
    );
}
