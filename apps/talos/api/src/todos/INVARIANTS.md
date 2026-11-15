# Invariants of talos, in `api/src/todos`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/talos/`.

## Todo

- Deleting one answers the removed `line` and its `position` among the task lines, which is what a restoration (`reinstateTodo`) needs to put it back.
- Its id is `sha1(text + "|" + addedOn)` cut to 10 hexadecimal characters (`domain/todo-id.core.ts`), so it survives a reordering of the file.
- Attributes the code does not know are kept on rewrite (`domain/line-attributes.core.ts`).
- Two files hold todos, each a `TodoList` named by `TodoListName` (`domain/todo-list.core.ts`): `main` for `todo.md`, `work` for `todo-taff.md`, the day-to-day work of the owner's assignments. Only `main` reaches the today screen (`isTodoListShownOnToday`).
- The Todo screen shows one list or both: a `TodoListChoice` is `main`, `work` or `both` (`site/src/components/organisms/todo-list.core.ts`). The kept choice is the one the device remembers (`site/src/lib/todo-list-choice.adapter.ts`).
