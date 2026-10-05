import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { createTodoValidator, todoIdValidator, updateTodoValidator } from './todos.schema';
import { addTodo, changeTodo, listTodos } from './todos.service';

// @FollowsBlueprint controller-guarded-router
export function buildTodosRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/', async (context) => context.json({ items: await listTodos() }))
    .post('/', createTodoValidator, async (context) =>
      context.json(await addTodo(context.req.valid('json'), new Date()), 201),
    )
    .patch('/:id', todoIdValidator, updateTodoValidator, async (context) =>
      context.json(
        await changeTodo(context.req.valid('param').id, context.req.valid('json'), new Date()),
      ),
    );
}
