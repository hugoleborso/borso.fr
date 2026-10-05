import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { TodoRow } from './TodoRow';

// @FollowsBlueprint test-component-render
describe('TodoRow', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the text, the due date and the commitment marker, and reports a check', async () => {
    const onToggle = vi.fn();
    render(
      <ul>
        <TodoRow
          text="Envoyer le CV"
          isDone={false}
          dueLabel="Aujourd'hui"
          dueTone="warning"
          dueIcon="clock"
          hasCommitment
          onToggle={onToggle}
        />
      </ul>,
    );
    expect(screen.getByText('Envoyer le CV')).toBeTruthy();
    expect(screen.getByText("Aujourd'hui")).toBeTruthy();
    expect(screen.getByText('Engagement')).toBeTruthy();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Cocher « Envoyer le CV »' }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('offers editing only when asked to, and shows a done todo checked', async () => {
    const onEdit = vi.fn();
    render(
      <ul>
        <TodoRow
          text="Payer"
          isDone
          dueLabel={null}
          dueTone="neutral"
          hasCommitment={false}
          onToggle={vi.fn()}
          onEdit={onEdit}
        />
      </ul>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Modifier « Payer »' }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(screen.getByRole<HTMLInputElement>('checkbox').checked).toBe(true);
    expect(screen.queryByText('Engagement')).toBeNull();
  });
});
