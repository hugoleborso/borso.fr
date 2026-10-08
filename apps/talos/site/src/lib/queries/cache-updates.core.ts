export interface CachedTodo {
  readonly id: string;
  readonly text: string;
  readonly done: boolean;
  readonly dueDate?: string;
  readonly doneOn?: string;
}

export interface TodoPatch {
  readonly done?: boolean;
  readonly text?: string;
  readonly dueDate?: string | null;
}

function patchTodo<Todo extends CachedTodo>(todo: Todo, patch: TodoPatch, today: string): Todo {
  const doneOn = patch.done === undefined ? todo.doneOn : patch.done ? today : undefined;
  const dueDate = patch.dueDate === undefined ? todo.dueDate : (patch.dueDate ?? undefined);
  return {
    ...todo,
    done: patch.done ?? todo.done,
    text: patch.text ?? todo.text,
    dueDate,
    doneOn,
  };
}

// @FollowsBlueprint core-optimistic-overlay
export function applyTodoPatch<Todo extends CachedTodo>(
  todos: readonly Todo[],
  todoId: string,
  patch: TodoPatch,
  today: string,
): Todo[] {
  return todos.map((todo) => (todo.id === todoId ? patchTodo(todo, patch, today) : todo));
}

export function replaceTodo<Todo extends CachedTodo>(
  todos: readonly Todo[],
  todoId: string,
  replacement: Todo,
): Todo[] {
  return todos.map((todo) => (todo.id === todoId ? replacement : todo));
}

export function buildPendingTodo(
  temporaryId: string,
  text: string,
  dueDate: string | undefined,
  today: string,
): CachedTodo & { addedOn: string } {
  return { id: temporaryId, text: text.trim(), done: false, dueDate, addedOn: today };
}

export interface CachedProposal {
  readonly slug: string;
  readonly status: string;
}

export function setProposalStatus<Proposal extends CachedProposal>(
  proposals: readonly Proposal[],
  slug: string,
  status: string,
): Proposal[] {
  return proposals.map((proposal) => (proposal.slug === slug ? { ...proposal, status } : proposal));
}

export function replaceProposal<Proposal extends CachedProposal>(
  proposals: readonly Proposal[],
  replacement: Proposal,
): Proposal[] {
  return proposals.map((proposal) => (proposal.slug === replacement.slug ? replacement : proposal));
}

export function removeById<Item extends { readonly id: string }>(
  items: readonly Item[],
  itemId: string,
): Item[] {
  return items.filter((item) => item.id !== itemId);
}

export function insertAt<Item>(items: readonly Item[], index: number, item: Item): Item[] {
  return [...items.slice(0, index), item, ...items.slice(index)];
}

export function findIndexById(
  items: readonly { readonly id: string }[],
  itemId: string,
): number | null {
  const index = items.findIndex((item) => item.id === itemId);
  return index === -1 ? null : index;
}

export function isKeptAfterSignOut(queryKey: readonly unknown[], sessionRoot: string): boolean {
  return queryKey[0] === sessionRoot;
}
