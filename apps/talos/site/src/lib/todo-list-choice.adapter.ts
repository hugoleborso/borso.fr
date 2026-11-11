/** @DependsOnExternal browser-local-storage */

export type ChoiceStorage = Pick<Storage, 'getItem' | 'setItem'>;

const TODO_LIST_CHOICE_KEY = 'talos.todo-list-choice';

function openBrowserStorage(): ChoiceStorage {
  return localStorage;
}

// @FollowsBlueprint injected-browser-api
export function readKeptTodoListChoice(
  openStorage: () => ChoiceStorage = openBrowserStorage,
): string | null {
  try {
    return openStorage().getItem(TODO_LIST_CHOICE_KEY);
  } catch {
    return null;
  }
}

export function didKeepTodoListChoice(
  choice: string,
  openStorage: () => ChoiceStorage = openBrowserStorage,
): boolean {
  try {
    openStorage().setItem(TODO_LIST_CHOICE_KEY, choice);
    return true;
  } catch {
    return false;
  }
}
