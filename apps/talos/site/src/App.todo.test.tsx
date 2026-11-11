import { fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import './i18n/i18n.setup';
import { App } from './App';
import {
  createIsolatedQueryClient,
  type FetchStub,
  flushUntil,
  jsonResponse,
  type MountedTree,
  mountWithClient,
  stubFetch,
} from './lib/queries/queries.test-utils';

const PERSONAL_TODO = { id: 'p1', text: 'Arroser le ficus', done: false, addedOn: '2026-10-04' };
const WORK_TODO = { id: 'w1', text: 'Relire la maquette', done: false, addedOn: '2026-10-05' };
const ACTIVE_TAB_CLASS_NAME = 'bg-on-shell/12';
const KEPT_CHOICE_KEY = 'talos.todo-list-choice';

const READS: Record<string, unknown> = {
  '/api/session': { signedIn: true, registered: true },
  '/api/todos': { items: [PERSONAL_TODO] },
  '/api/work-todos': { items: [WORK_TODO] },
};

function serveBothLists(): FetchStub {
  return stubFetch((request) => {
    const path = new URL(request.url).pathname;
    if (request.method === 'POST') {
      return Promise.resolve(jsonResponse({ ...PERSONAL_TODO, id: 'n1', text: 'Nouvelle' }, 201));
    }
    if (request.method === 'PATCH') {
      return Promise.resolve(jsonResponse({ ...WORK_TODO, done: true, doneOn: '2026-10-08' }));
    }
    const body = READS[path];
    return Promise.resolve(
      body === undefined ? jsonResponse({ error: 'non' }, 500) : jsonResponse(body),
    );
  });
}

async function openApp(address: string, shownText: string): Promise<MountedTree> {
  window.history.replaceState(null, '', address);
  const tree = mountWithClient(createIsolatedQueryClient(), <App />);
  await flushUntil(() => tree.container.textContent.includes(shownText));
  return tree;
}

function listSwitch(tree: MountedTree): HTMLButtonElement[] {
  return [...tree.container.querySelectorAll<HTMLButtonElement>('[aria-label="Liste"] button')];
}

function readChoice(tree: MountedTree): string | undefined {
  return listSwitch(tree).find((button) => button.getAttribute('aria-pressed') === 'true')
    ?.textContent;
}

async function choose(tree: MountedTree, label: string, shownText: string): Promise<void> {
  const button = listSwitch(tree).find((candidate) => candidate.textContent === label);
  if (button === undefined) throw new Error(`no choice ${label}`);
  fireEvent.click(button);
  await flushUntil(() => tree.container.textContent.includes(shownText));
}

function readSectionNames(tree: MountedTree): (string | null)[] {
  return [...tree.container.querySelectorAll('main section[aria-label]')].map((section) =>
    section.getAttribute('aria-label'),
  );
}

async function quickAdd(tree: MountedTree, stub: FetchStub, placeholder: string): Promise<string> {
  const input = tree.container.querySelector<HTMLInputElement>(
    `input[placeholder="${placeholder}"]`,
  );
  if (input === null) throw new Error(`no quick add saying ${placeholder}`);
  fireEvent.change(input, { target: { value: 'Nouvelle' } });
  const form = input.closest('form');
  if (form === null) throw new Error('no quick add form');
  fireEvent.submit(form);
  await flushUntil(() => stub.calls.some((call) => call.method === 'POST'));
  return new URL(stub.calls.find((call) => call.method === 'POST')?.url ?? '').pathname;
}

describe('the one todo tab', () => {
  let stub: FetchStub | undefined;
  let tree: MountedTree | undefined;

  afterEach(() => {
    tree?.unmount();
    stub?.restore();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('keeps five tabs, and opens the todo screen on the personal list with a three-way switch', async () => {
    stub = serveBothLists();
    tree = await openApp('/todos', PERSONAL_TODO.text);
    expect(
      [...tree.container.querySelectorAll('nav[aria-label="Navigation principale"] a')].map(
        (tab) => tab.textContent,
      ),
    ).toStrictEqual(['Jour', 'Todo', 'Décider', 'Mémoire', 'Message']);
    expect(listSwitch(tree).map((button) => button.textContent)).toStrictEqual([
      'Perso',
      'Taff',
      'Les deux',
    ]);
    expect(readChoice(tree)).toBe('Perso');
    expect(tree.container.textContent).not.toContain(WORK_TODO.text);
    expect(stub.calls.some((call) => new URL(call.url).pathname === '/api/work-todos')).toBe(false);
  });

  it('shows the work list alone on « Taff », where a quick add goes to the work list', async () => {
    stub = serveBothLists();
    tree = await openApp('/todos', PERSONAL_TODO.text);
    await choose(tree, 'Taff', WORK_TODO.text);
    expect(readChoice(tree)).toBe('Taff');
    expect(tree.container.textContent).not.toContain(PERSONAL_TODO.text);
    expect(readSectionNames(tree)).toStrictEqual(['Taff']);
    expect(await quickAdd(tree, stub, 'Nouvelle tâche')).toBe('/api/work-todos');
  });

  it('shows both lists on « Les deux », the personal one first, each row acting on its own list', async () => {
    stub = serveBothLists();
    tree = await openApp('/todos', PERSONAL_TODO.text);
    await choose(tree, 'Les deux', WORK_TODO.text);
    expect(readSectionNames(tree)).toStrictEqual(['Perso', 'Taff']);
    expect(
      [...tree.container.querySelectorAll('main section[aria-label] > h2')].map(
        (heading) => heading.textContent,
      ),
    ).toStrictEqual(['Perso · 1 à faire', 'Taff · 1 à faire']);
    const sections = [...tree.container.querySelectorAll('main section[aria-label]')];
    expect(sections[0]?.textContent).toContain(PERSONAL_TODO.text);
    expect(sections[1]?.textContent).toContain(WORK_TODO.text);
    const check = tree.container.querySelector(`input[aria-label="Cocher « ${WORK_TODO.text} »"]`);
    if (check === null) throw new Error('no check on the work row');
    fireEvent.click(check);
    const calls = stub.calls;
    await flushUntil(() => calls.some((call) => call.method === 'PATCH'));
    expect(new URL(calls.find((call) => call.method === 'PATCH')?.url ?? '').pathname).toBe(
      '/api/work-todos/w1',
    );
    expect(await quickAdd(tree, stub, 'Nouvelle tâche perso')).toBe('/api/todos');
  });

  it('applies the done filter to both lists at once', async () => {
    stub = serveBothLists();
    tree = await openApp('/todos?list=both', WORK_TODO.text);
    const done = [...tree.container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Faites',
    );
    if (done === undefined) throw new Error('no done filter');
    fireEvent.click(done);
    expect(tree.container.textContent).not.toContain(PERSONAL_TODO.text);
    expect(tree.container.textContent).not.toContain(WORK_TODO.text);
    expect(tree.container.textContent.split('Rien de fait')).toHaveLength(3);
  });

  it('opens on the choice kept on the device the next time', async () => {
    stub = serveBothLists();
    tree = await openApp('/todos', PERSONAL_TODO.text);
    await choose(tree, 'Taff', WORK_TODO.text);
    expect(localStorage.getItem(KEPT_CHOICE_KEY)).toBe('work');
    tree.unmount();
    tree = await openApp('/todos', WORK_TODO.text);
    expect(readChoice(tree)).toBe('Taff');
    expect(tree.container.textContent).not.toContain(PERSONAL_TODO.text);
  });

  it('opens the former work address on « Taff », and comes back there from a work todo', async () => {
    localStorage.setItem(KEPT_CHOICE_KEY, 'both');
    stub = serveBothLists();
    tree = await openApp('/work-todos', WORK_TODO.text);
    const { container } = tree;
    expect(`${window.location.pathname}${window.location.search}`).toBe('/todos?list=work');
    expect(readChoice(tree)).toBe('Taff');
    expect(container.textContent).not.toContain(PERSONAL_TODO.text);
    const row = [...container.querySelectorAll('main li button')].find((button) =>
      button.textContent.includes(WORK_TODO.text),
    );
    if (row === undefined) throw new Error('no work row');
    fireEvent.click(row);
    await flushUntil(() => container.querySelector('main h1')?.textContent === WORK_TODO.text);
    expect(window.location.pathname).toBe('/work-todos/w1');
    expect(
      [...container.querySelectorAll('nav a')]
        .filter((tab) => tab.className.includes(ACTIVE_TAB_CLASS_NAME))
        .map((tab) => tab.textContent),
    ).toStrictEqual(['Todo']);
    const back = container.querySelector('button[aria-label="Retour"]');
    if (back === null) throw new Error('no back link');
    fireEvent.click(back);
    await flushUntil(() => container.querySelector('[aria-label="Liste"]') !== null);
    expect(`${window.location.pathname}${window.location.search}`).toBe('/todos?list=work');
    expect(readChoice(tree)).toBe('Taff');
    expect(container.textContent).toContain(WORK_TODO.text);
    expect(container.textContent).not.toContain(PERSONAL_TODO.text);
  });
});
