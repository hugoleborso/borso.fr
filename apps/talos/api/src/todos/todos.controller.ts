import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import {
  createTodoValidator,
  restoreTodoValidator,
  todoIdValidator,
  updateTodoValidator,
} from './todos.schema';
import {
  addTodo,
  changeTodo,
  deleteTodo,
  listTodos,
  reinstateTodo,
  type TodoList,
} from './todos.service';

// @FollowsBlueprint controller-guarded-router
export function buildTodosRouter(list: TodoList) {
  return new Hono()
    .use('*', requireSession)
    .get('/', async (context) => context.json({ items: await listTodos(list) }))
    .post('/', createTodoValidator, async (context) =>
      context.json(await addTodo(list, context.req.valid('json'), new Date()), 201),
    )
    .post('/restorations', restoreTodoValidator, async (context) =>
      context.json(await reinstateTodo(list, context.req.valid('json')), 201),
    )
    .delete('/:id', todoIdValidator, async (context) =>
      context.json(await deleteTodo(list, context.req.valid('param').id)),
    )
    .patch('/:id', todoIdValidator, updateTodoValidator, async (context) =>
      context.json(
        await changeTodo(
          list,
          context.req.valid('param').id,
          context.req.valid('json'),
          new Date(),
        ),
      ),
    );
}
