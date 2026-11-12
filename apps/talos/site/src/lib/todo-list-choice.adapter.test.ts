import { beforeEach, describe, expect, it } from 'vitest';
import {
  type ChoiceStorage,
  didKeepTodoListChoice,
  readKeptTodoListChoice,
} from './todo-list-choice.adapter';

const refuseStorage = (): ChoiceStorage => {
  throw new Error('storage denied');
};

const openBrokenStorage = (): ChoiceStorage => ({
  getItem: () => {
    throw new Error('read denied');
  },
  setItem: () => {
    throw new Error('quota exceeded');
  },
});

describe('the kept choice of todo list', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is absent on a device that never chose', () => {
    expect(readKeptTodoListChoice()).toBeNull();
  });

  it('is read back from the device once kept', () => {
    expect(didKeepTodoListChoice('work')).toBe(true);
    expect(localStorage.getItem('talos.todo-list-choice')).toBe('work');
    expect(readKeptTodoListChoice()).toBe('work');
  });

  it('goes to the storage it is handed', () => {
    const kept = new Map<string, string>();
    const openStorage = (): ChoiceStorage => ({
      getItem: (key) => kept.get(key) ?? null,
      setItem: (key, value) => {
        kept.set(key, value);
      },
    });
    expect(didKeepTodoListChoice('both', openStorage)).toBe(true);
    expect(readKeptTodoListChoice(openStorage)).toBe('both');
    expect(localStorage.getItem('talos.todo-list-choice')).toBeNull();
  });

  it('reads nothing and keeps nothing when the browser refuses its storage', () => {
    expect(readKeptTodoListChoice(refuseStorage)).toBeNull();
    expect(didKeepTodoListChoice('work', refuseStorage)).toBe(false);
  });

  it('reads nothing and keeps nothing when the storage throws on use', () => {
    expect(readKeptTodoListChoice(openBrokenStorage)).toBeNull();
    expect(didKeepTodoListChoice('work', openBrokenStorage)).toBe(false);
  });
});
