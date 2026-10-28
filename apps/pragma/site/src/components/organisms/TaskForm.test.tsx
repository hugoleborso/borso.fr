import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { stubSheetDialog } from '../molecules/sheet.test-utils';
import { TaskForm, type TaskFormValues } from './TaskForm';

const BLANK: TaskFormValues = {
  title: '',
  notes: '',
  status: 'todo',
  assigneeId: null,
  songId: null,
  sessionId: null,
  dueDate: '',
};
const SONGS = [
  { id: 'song-cover', title: 'Psycho Killer' },
  { id: 'song-original', title: 'Runaway Sun' },
];
const SESSIONS = [{ id: 'session-1', label: 'Practice · Wed 28 Oct 2026' }];
const TYPED_TITLE = 'Imprimer les setlists';

function renderTaskForm(draftKey: string, values: TaskFormValues = BLANK) {
  const onClose = vi.fn();
  const onSubmit = vi.fn(async (): Promise<void> => undefined);
  const view = render(
    <TaskForm
      draftKey={draftKey}
      values={values}
      isEditing={draftKey !== 'new'}
      members={[]}
      songs={SONGS}
      sessions={SESSIONS}
      onSubmit={onSubmit}
      onClose={onClose}
    />,
  );
  return { ...view, onClose, onSubmit };
}

function typeTitle(title: string): void {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: title } });
}

function readTitle(): string {
  const field = screen.getByLabelText('Title');
  return field instanceof HTMLInputElement ? field.value : '';
}

function closeByEscape(): void {
  const dialog = screen.getByRole('dialog');
  act(() => {
    if (dialog instanceof HTMLDialogElement) dialog.close();
  });
}

// @FollowsBlueprint test-component-render
describe('the task sheet links', () => {
  beforeEach(() => {
    stubSheetDialog();
  });

  afterEach(() => {
    cleanup();
  });

  it('offers every song, not only the compositions', () => {
    renderTaskForm('task-songs');
    const options = Array.from(screen.getByLabelText('Song').querySelectorAll('option')).map(
      (option) => option.textContent,
    );
    expect(options).toEqual(['No song', 'Psycho Killer', 'Runaway Sun']);
  });

  it('opens already linked to the session it was opened from', () => {
    renderTaskForm('new:session-1', { ...BLANK, sessionId: 'session-1' });
    const field = screen.getByLabelText('Session');
    expect(field instanceof HTMLSelectElement ? field.value : null).toBe('session-1');
  });
});

describe('a task sheet draft', () => {
  beforeEach(() => {
    stubSheetDialog();
  });

  afterEach(() => {
    cleanup();
  });

  it('is kept after Escape and shown on reopening', () => {
    const first = renderTaskForm('task-escape');
    typeTitle(TYPED_TITLE);
    closeByEscape();
    expect(first.onClose).toHaveBeenCalled();
    first.unmount();
    renderTaskForm('task-escape');
    expect(readTitle()).toBe(TYPED_TITLE);
  });

  it('is kept after a click on the backdrop', () => {
    const first = renderTaskForm('task-backdrop');
    typeTitle(TYPED_TITLE);
    fireEvent.click(screen.getByRole('dialog'));
    expect(first.onClose).toHaveBeenCalled();
    first.unmount();
    renderTaskForm('task-backdrop');
    expect(readTitle()).toBe(TYPED_TITLE);
  });

  it('is gone once saved, so New task opens blank', async () => {
    const first = renderTaskForm('new');
    typeTitle(TYPED_TITLE);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(first.onSubmit).toHaveBeenCalled();
    });
    closeByEscape();
    first.unmount();
    renderTaskForm('new');
    expect(readTitle()).toBe('');
  });

  it('belongs to one task: an edited task closed does not fill another one', () => {
    const first = renderTaskForm('task-a', { ...BLANK, title: 'Task A' });
    typeTitle('Task A, changed');
    closeByEscape();
    first.unmount();
    renderTaskForm('task-b', { ...BLANK, title: 'Task B' });
    expect(readTitle()).toBe('Task B');
  });

  it('keeps nothing when the sheet closes untouched', () => {
    const first = renderTaskForm('task-untouched', { ...BLANK, title: 'Server title' });
    closeByEscape();
    first.unmount();
    renderTaskForm('task-untouched', { ...BLANK, title: 'Newer server title' });
    expect(readTitle()).toBe('Newer server title');
  });
});
