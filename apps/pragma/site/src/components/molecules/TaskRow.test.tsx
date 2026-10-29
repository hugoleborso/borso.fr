import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { TaskRow } from './TaskRow';

const TASK_TITLE = 'Learn the bridge of Comfortably Numb';

// @FollowsBlueprint test-component-render
describe('the task row', () => {
  afterEach(() => {
    cleanup();
  });

  it('opens the task from a button that carries an icon beside the title', () => {
    render(
      <TaskRow
        title={TASK_TITLE}
        status="todo"
        dueLabel={null}
        songTitle={null}
        isOverdue={false}
        onToggleDone={vi.fn()}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const openingButton = screen.getByRole('button', { name: TASK_TITLE });
    expect(openingButton.querySelector('svg')).not.toBeNull();
  });
});
