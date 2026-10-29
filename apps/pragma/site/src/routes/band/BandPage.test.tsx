import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { stubSheetDialog } from '../../components/molecules/sheet.test-utils';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { BandPage } from './BandPage';

const MEMBER = { id: 'member-1', firstName: 'Ada', color: '#c0392b' };
const OTHER_MEMBER = { id: 'member-2', firstName: 'Bo', color: '#2d5fa0' };
const EXISTING_TASK = {
  id: 'task-1',
  title: 'Book the rehearsal room',
  notes: 'Ask for the big room',
  status: 'doing',
  assigneeId: MEMBER.id,
  songId: null,
  dueDate: null,
};
const OTHER_TASK = {
  ...EXISTING_TASK,
  id: 'task-2',
  title: 'Print the setlists',
  notes: '',
  assigneeId: OTHER_MEMBER.id,
};
const SIGNED_IN = {
  memberId: MEMBER.id,
  firstName: MEMBER.firstName,
  color: MEMBER.color,
  username: 'ada',
  phone: null,
  email: null,
  calendarFeed: { isConnected: false },
};

function renderBandPage(initialEntry = '/band'): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <BandPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function answerBandApi(request: Request): Response {
  if (request.url.includes('/api/tasks') && request.method === 'POST') {
    return jsonResponse({ task: { ...EXISTING_TASK, id: 'task-3', title: 'Buy strings' } }, 201);
  }
  if (request.url.includes('/api/tasks'))
    return jsonResponse({ tasks: [EXISTING_TASK, OTHER_TASK] });
  if (request.url.includes('/api/members'))
    return jsonResponse({ members: [MEMBER, OTHER_MEMBER] });
  if (request.url.includes('/api/songs')) return jsonResponse({ songs: [] });
  if (request.url.includes('/api/me')) return jsonResponse(SIGNED_IN);
  return new Response(null, { status: 404 });
}

// @FollowsBlueprint test-component-render
describe('the band page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stubSheetDialog();
    stub = stubFetch((request) => Promise.resolve(answerBandApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('opens on the signed-in member tasks only', async () => {
    renderBandPage();
    const myTasks = await screen.findByRole('list', { name: 'My tasks' });
    await within(myTasks).findByText(EXISTING_TASK.title);
    expect(within(myTasks).queryByText(OTHER_TASK.title)).toBe(null);
  });

  it('shows every member column on Everyone', async () => {
    renderBandPage('/band?view=everyone');
    expect(await screen.findByRole('list', { name: OTHER_MEMBER.firstName })).toBeTruthy();
    expect(screen.getByText(OTHER_TASK.title)).toBeTruthy();
  });

  it('switches to Everyone from the section tab', async () => {
    renderBandPage();
    await screen.findByText(EXISTING_TASK.title);
    fireEvent.click(screen.getByRole('tab', { name: 'Everyone' }));
    expect(await screen.findByText(OTHER_TASK.title)).toBeTruthy();
  });

  it('carries New task as its one primary action and no quick add field', async () => {
    renderBandPage();
    await screen.findByText(EXISTING_TASK.title);
    const primaries = document.querySelectorAll('[data-variant="primary"]');
    expect([...primaries].map((element) => element.textContent)).toEqual(['New task']);
    expect(screen.queryByPlaceholderText('New task')).toBe(null);
  });

  it('opens the full form in a sheet from the New task button, with the title field focused', async () => {
    renderBandPage();
    fireEvent.click(await screen.findByRole('button', { name: 'New task' }));
    const sheet = screen.getByRole('dialog', { name: 'New task' });
    const titleField = within(sheet).getByLabelText('Title');
    expect(document.activeElement).toBe(titleField);
    expect(titleField).toHaveProperty('value', '');
    expect(within(sheet).getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('opens the same sheet filled with the values of a tapped task', async () => {
    renderBandPage();
    fireEvent.click(await screen.findByRole('button', { name: EXISTING_TASK.title }));
    const sheet = screen.getByRole('dialog', { name: 'Edit task' });
    expect(within(sheet).getByLabelText('Title')).toHaveProperty('value', EXISTING_TASK.title);
    expect(within(sheet).getByLabelText('Notes')).toHaveProperty('value', EXISTING_TASK.notes);
  });

  it('saves a new task from the sheet', async () => {
    renderBandPage();
    fireEvent.click(await screen.findByRole('button', { name: 'New task' }));
    const sheet = screen.getByRole('dialog', { name: 'New task' });
    fireEvent.change(within(sheet).getByLabelText('Title'), { target: { value: 'Buy strings' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(stub?.calls.some((call) => call.method === 'POST')).toBe(true);
    });
  });

  it('lists the band links with the account page last', async () => {
    renderBandPage();
    const links = within(await screen.findByRole('navigation', { name: 'The band' })).getAllByRole(
      'link',
    );
    expect(links.at(-1)?.getAttribute('href')).toBe('/account');
    expect(links.map((link) => link.getAttribute('href'))).toContain('/members');
  });

  it('puts the band links above the tasks, so no task list hides them, under a fixed header', async () => {
    renderBandPage();
    const links = await screen.findByRole('navigation', { name: 'The band' });
    const tasks = await screen.findByRole('list', { name: 'My tasks' });
    expect(links.compareDocumentPosition(tasks) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const header = screen.getByRole('heading', { level: 1, name: 'Band' }).closest('header');
    expect(header?.classList.contains('sticky')).toBe(true);
    expect(header?.querySelector('[role=tablist]')).not.toBeNull();
  });
});
