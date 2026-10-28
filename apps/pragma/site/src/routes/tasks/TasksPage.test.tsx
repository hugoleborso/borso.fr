import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { stubSheetDialog } from '../../components/molecules/sheet.test-utils';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { TasksPage } from './TasksPage';

const MEMBER = { id: 'member-1', firstName: 'Ada', color: '#c0392b' };
const EXISTING_TASK = {
  id: 'task-1',
  title: 'Book the rehearsal room',
  notes: 'Ask for the big room',
  status: 'doing',
  assigneeId: MEMBER.id,
  songId: null,
  dueDate: null,
};
const QUICK_TITLE = 'Buy strings';

function renderTasksPage(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <TasksPage />
    </QueryClientProvider>,
  );
}

function answerTasksApi(request: Request): Response {
  if (request.url.includes('/api/tasks') && request.method === 'POST') {
    return jsonResponse({ task: { ...EXISTING_TASK, id: 'task-2', title: QUICK_TITLE } }, 201);
  }
  if (request.url.includes('/api/tasks')) return jsonResponse({ tasks: [EXISTING_TASK] });
  if (request.url.includes('/api/members')) return jsonResponse({ members: [MEMBER] });
  if (request.url.includes('/api/songs')) return jsonResponse({ songs: [] });
  return new Response(null, { status: 404 });
}

// @FollowsBlueprint test-component-render
describe('the tasks page', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stubSheetDialog();
    stub = stubFetch((request) => Promise.resolve(answerTasksApi(request)));
  });

  afterEach(() => {
    cleanup();
    stub?.restore();
  });

  it('shows no task form and no save button until a sheet is opened', async () => {
    renderTasksPage();
    await screen.findByText(EXISTING_TASK.title);
    expect(screen.queryByRole('dialog')).toBe(null);
    expect(screen.queryByRole('button', { name: 'Save' })).toBe(null);
  });

  it('opens the full form in a sheet from the New task button, with the title field focused', async () => {
    renderTasksPage();
    fireEvent.click(await screen.findByRole('button', { name: 'New task' }));
    const sheet = screen.getByRole('dialog', { name: 'New task' });
    const titleField = within(sheet).getByLabelText('Title');
    expect(document.activeElement).toBe(titleField);
    expect(titleField).toHaveProperty('value', '');
    expect(within(sheet).getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('opens the same sheet filled with the values of a tapped task', async () => {
    renderTasksPage();
    fireEvent.click(await screen.findByRole('button', { name: EXISTING_TASK.title }));
    const sheet = screen.getByRole('dialog', { name: 'Edit task' });
    expect(within(sheet).getByLabelText('Title')).toHaveProperty('value', EXISTING_TASK.title);
    expect(within(sheet).getByLabelText('Notes')).toHaveProperty('value', EXISTING_TASK.notes);
  });

  it('adds a task from the quick field without opening a sheet', async () => {
    renderTasksPage();
    await screen.findByText(EXISTING_TASK.title);
    fireEvent.change(screen.getByPlaceholderText('New task'), { target: { value: QUICK_TITLE } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => {
      expect(stub?.calls.some((call) => call.method === 'POST')).toBe(true);
    });
    expect(screen.queryByRole('dialog')).toBe(null);
  });
});
