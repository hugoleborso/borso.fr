import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { TodoRow } from './TodoRow';

const LONG_PRESS_MS = 450;

function renderRow(overrides: Partial<Parameters<typeof TodoRow>[0]> = {}) {
  const props = {
    text: 'Envoyer le CV',
    isDone: false,
    dueLabel: "Aujourd'hui",
    dueTone: 'warning' as const,
    dueIcon: 'clock' as const,
    onToggle: vi.fn(),
    ...overrides,
  };
  render(
    <ul>
      <TodoRow {...props} />
    </ul>,
  );
  return props;
}

function pressSurface(): HTMLElement {
  const surface = screen.getByText('Envoyer le CV').closest('button')?.parentElement;
  if (surface === null || surface === undefined) throw new Error('no press surface');
  return surface;
}

// @FollowsBlueprint test-component-render
describe('TodoRow', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows the text and the due date, and reports a check', async () => {
    const { onToggle } = renderRow();
    expect(screen.getByText("Aujourd'hui")).toBeTruthy();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Cocher « Envoyer le CV »' }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('opens the detail on a tap of the text, and shows a done todo checked', async () => {
    const onOpen = vi.fn();
    renderRow({ isDone: true, dueLabel: null, onOpen });
    await userEvent.click(screen.getByText('Envoyer le CV'));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(screen.getByRole<HTMLInputElement>('checkbox').checked).toBe(true);
  });

  it('reports a long press and swallows the tap that ends it', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const onOpen = vi.fn();
    renderRow({ onLongPress, onOpen });
    const surface = pressSurface();
    fireEvent.pointerDown(surface, { button: 0, clientX: 10, clientY: 10 });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    fireEvent.pointerUp(surface);
    fireEvent.click(screen.getByText('Envoyer le CV'));
    expect(onLongPress).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('gives up the long press when the finger moves, as when scrolling', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    renderRow({ onLongPress });
    const surface = pressSurface();
    fireEvent.pointerDown(surface, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(surface, { clientX: 10, clientY: 40 });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    fireEvent.pointerCancel(surface);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('checks the todo on a swipe to the right, and not on a short one', () => {
    const { onToggle } = renderRow();
    const surface = pressSurface();
    fireEvent.pointerDown(surface, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(surface, { clientX: 50, clientY: 12 });
    fireEvent.pointerUp(surface);
    expect(onToggle).not.toHaveBeenCalled();
    fireEvent.pointerDown(surface, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(surface, { clientX: 110, clientY: 14 });
    expect(surface.style.transform).toBe('translateX(100px)');
    fireEvent.pointerUp(surface);
    expect(onToggle).toHaveBeenCalledOnce();
    expect(surface.style.transform).toBe('translateX(0px)');
  });

  it('deletes the todo on a swipe to the left, and only when deletion is offered', () => {
    const onDelete = vi.fn();
    const { onToggle } = renderRow({ onDelete });
    const surface = pressSurface();
    fireEvent.pointerDown(surface, { button: 0, clientX: 200, clientY: 10 });
    fireEvent.pointerMove(surface, { clientX: 100, clientY: 14 });
    expect(surface.style.transform).toBe('translateX(-100px)');
    fireEvent.pointerUp(surface);
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onToggle).not.toHaveBeenCalled();
    cleanup();
    renderRow();
    const withoutDeletion = pressSurface();
    fireEvent.pointerDown(withoutDeletion, { button: 0, clientX: 200, clientY: 10 });
    fireEvent.pointerMove(withoutDeletion, { clientX: 100, clientY: 14 });
    expect(withoutDeletion.style.transform).toBe('translateX(0px)');
  });

  it('ignores a secondary button and keeps the native menu only where nothing is bound', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    renderRow({ onLongPress });
    const surface = pressSurface();
    fireEvent.pointerDown(surface, { button: 2, clientX: 10, clientY: 10 });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(onLongPress).not.toHaveBeenCalled();
    expect(fireEvent.contextMenu(surface)).toBe(false);
  });
});
