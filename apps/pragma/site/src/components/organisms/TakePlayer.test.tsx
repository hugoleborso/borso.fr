import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import type { ListedTake } from '../../lib/queries/takes.queries';
import { TakePlayer } from './TakePlayer';

const IDLE_MUTATION = { mutate: vi.fn(), mutateAsync: vi.fn(), isError: false };
const takes = vi.hoisted(() => ({
  useTakePlaybackUrl: vi.fn(),
  useTakeComments: vi.fn(),
  useCreateTakeComment: vi.fn(),
  useDeleteTake: vi.fn(),
  useDeleteTakeComment: vi.fn(),
}));

vi.mock('../../lib/queries/takes.queries', () => takes);

const TAKE: ListedTake = {
  id: 'take-1',
  songId: 'song-1',
  sessionId: null,
  memberId: 'member-1',
  authorName: 'Hugo',
  objectKey: 'take/song-1/take-1.webm',
  contentType: 'audio/webm',
  durationSeconds: 200,
  recordedAt: '2026-10-24T18:00:00.000Z',
  createdAt: '2026-10-24T18:00:00.000Z',
  commentCount: 2,
};

function comment(id: string, atSeconds: number | null, body: string): Record<string, unknown> {
  return {
    id,
    takeId: TAKE.id,
    memberId: 'member-2',
    authorName: 'Léa',
    body,
    atSeconds,
    createdAt: '2026-10-24T18:05:00.000Z',
  };
}

function renderPlayer(comments: readonly Record<string, unknown>[]): void {
  takes.useTakePlaybackUrl.mockReturnValue({ data: { getUrl: 'blob:take' }, isError: false });
  takes.useTakeComments.mockReturnValue({ data: { comments } });
  takes.useCreateTakeComment.mockReturnValue(IDLE_MUTATION);
  takes.useDeleteTake.mockReturnValue(IDLE_MUTATION);
  takes.useDeleteTakeComment.mockReturnValue(IDLE_MUTATION);
  render(<TakePlayer take={TAKE} onClose={vi.fn()} />);
}

function readReach(markButton: HTMLElement): { left: string; width: string } {
  const reach = markButton.parentElement;
  return { left: reach?.style.left ?? '', width: reach?.style.width ?? '' };
}

const TOUCH_TARGET_CLASSES = ['min-h-11', 'min-w-11'];
const SQUARE_TOUCH_TARGET_CLASS = 'size-11';

function hasTouchTargetClasses(control: HTMLElement): boolean {
  return (
    control.classList.contains(SQUARE_TOUCH_TARGET_CLASS) ||
    TOUCH_TARGET_CLASSES.every((targetClass) => control.classList.contains(targetClass))
  );
}

// @FollowsBlueprint test-component-render
describe('TakePlayer', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('gives each timeline mark a 44 px square to tap while the mark itself stays 12 by 24 px', () => {
    renderPlayer([comment('bass', 20, 'the bass comes in late')]);

    const markButton = screen.getByRole('button', { name: 'Go to 0:20' });
    expect(markButton.classList.contains('h-11')).toBe(true);
    expect(markButton.classList.contains('w-11')).toBe(true);
    expect(markButton.parentElement?.classList.contains('overflow-hidden')).toBe(true);

    const track = screen.getByRole('group', { name: 'Comments on the timeline' });
    const [visibleMark] = track.querySelectorAll('[aria-hidden="true"] span');
    expect(visibleMark?.classList.contains('w-3')).toBe(true);
    expect(visibleMark?.classList.contains('h-6')).toBe(true);
    expect(track.classList.contains('h-11')).toBe(true);
  });

  it('splits the track halfway between two close marks, so a tap reaches the nearer one only', () => {
    renderPlayer([comment('first', 20, 'drums rush'), comment('second', 22, 'bass late')]);

    const first = readReach(screen.getByRole('button', { name: 'Go to 0:20' }));
    const second = readReach(screen.getByRole('button', { name: 'Go to 0:22' }));
    expect(first).toEqual({ left: '-100%', width: '110.5%' });
    expect(second).toEqual({ left: '10.5%', width: '189.5%' });
  });

  it('jumps to the moment of a tapped mark and offers to pin the next comment there', async () => {
    const user = userEvent.setup();
    renderPlayer([comment('bass', 12, 'the bass comes in late')]);

    await user.click(screen.getByRole('button', { name: 'Go to 0:12' }));

    const momentToggle = screen.getByRole('checkbox', { name: 'At 0:12' });
    expect(momentToggle).toHaveProperty('checked', true);
  });

  it('gives every other control of the player and its thread at least 44 by 44 px', () => {
    renderPlayer([comment('bass', 12, 'the bass comes in late')]);

    const controls = [
      screen.getByRole('button', { name: 'Close' }),
      screen.getByRole('button', { name: 'Delete comment' }),
      screen.getByRole('button', { name: '0:12' }),
    ];
    for (const control of controls) {
      expect(hasTouchTargetClasses(control)).toBe(true);
    }
    expect(screen.getByRole('button', { name: /Delete take/ }).classList.contains('min-h-11')).toBe(
      true,
    );
  });
});
