import { describe, expect, it } from 'vitest';
import type { TaskShape } from '../band/band-tasks.core';
import {
  buildHomeView,
  type HomeSong,
  type HomeViewInput,
  selectHomePrimaryAction,
} from './home.core';

const MEMBER = 'member-1';
const OTHER_MEMBER = 'member-2';
const GUITAR = 'guitar-id';
const BASS = 'bass-id';

function song(
  id: string,
  lineup: Record<string, readonly string[]>,
  durationSeconds: number | null,
): HomeSong {
  return { id, title: `Title ${id}`, artist: '', defaultLineup: lineup, durationSeconds };
}

function task(overrides: Partial<TaskShape>): TaskShape {
  return {
    id: 'task',
    title: 'Task',
    notes: '',
    status: 'todo',
    assigneeId: MEMBER,
    songId: null,
    dueDate: null,
    ...overrides,
  };
}

const SONGS: readonly HomeSong[] = [
  song('a', { [MEMBER]: [GUITAR] }, 200),
  song('b', { [OTHER_MEMBER]: [BASS] }, null),
  song('c', { [MEMBER]: [GUITAR, BASS] }, 100),
  song('d', { [OTHER_MEMBER]: [GUITAR] }, 60),
  { id: 'e', title: 'Title e', artist: '', defaultLineup: { [OTHER_MEMBER]: [GUITAR] } },
];

const INPUT: HomeViewInput = {
  setlist: { id: 'setlist-1', name: 'Wednesday', songCount: 5 },
  entries: [
    { id: 'e1', songId: 'a', lineupOverride: null },
    { id: 'e2', songId: 'b', lineupOverride: null },
    { id: 'e3', songId: 'c', lineupOverride: null },
    { id: 'e4', songId: 'd', lineupOverride: { [MEMBER]: [BASS] } },
    { id: 'e5', songId: 'e', lineupOverride: null },
    { id: 'e6', songId: 'missing', lineupOverride: null },
  ],
  songs: SONGS,
  instruments: [
    { id: GUITAR, name: 'Guitar', icon: 'guitar' },
    { id: BASS, name: 'Bass', icon: 'bass' },
  ],
  tasks: [],
  memberId: MEMBER,
};

// @FollowsBlueprint test-pure-unit
describe('buildHomeView', () => {
  it('lists the songs where the member plays, an override included, with the instruments', () => {
    const view = buildHomeView(INPUT);
    expect(view.memberPart.map((row) => row.entryId)).toEqual(['e1', 'e3', 'e4']);
    expect(view.memberPart[0]).toMatchObject({ songTitle: 'Title a' });
    expect(view.memberPart[1]?.parts.map((part) => part.name)).toEqual(['Guitar', 'Bass']);
    expect(view.memberPart[2]?.parts.map((part) => part.name)).toEqual(['Bass']);
  });

  it('adds up the known durations of the setlist songs', () => {
    expect(buildHomeView(INPUT).totalSeconds).toBe(360);
  });

  it('knows no total without a setlist', () => {
    expect(buildHomeView({ ...INPUT, setlist: null, entries: [] }).totalSeconds).toBeNull();
  });

  it('keeps the open tasks of the member in the order given', () => {
    const tasks = [
      task({ id: 'doing', status: 'doing' }),
      task({ id: 'theirs', assigneeId: OTHER_MEMBER }),
      task({ id: 'done', status: 'done' }),
      task({ id: 'todo' }),
    ];
    expect(buildHomeView({ ...INPUT, tasks }).memberTasks.map((row) => row.id)).toEqual([
      'doing',
      'todo',
    ]);
  });

  it('shows no part and no task to an account with no member row', () => {
    const view = buildHomeView({ ...INPUT, tasks: [task({})], memberId: null });
    expect(view.memberPart).toEqual([]);
    expect(view.memberTasks).toEqual([]);
  });
});

// @FollowsBlueprint test-pure-unit
describe('selectHomePrimaryAction', () => {
  it('opens the setlist of the next session', () => {
    expect(
      selectHomePrimaryAction({ isLoading: false, nextSessionId: 's1', setlistId: 'l1' }),
    ).toEqual({
      link: { to: '/setlists/l1', labelKey: 'home.openSetlist' },
      isNewSessionOffered: false,
    });
  });

  it('opens the session when it has no setlist yet', () => {
    expect(
      selectHomePrimaryAction({ isLoading: false, nextSessionId: 's1', setlistId: null }),
    ).toEqual({
      link: { to: '/sessions/s1', labelKey: 'home.openSession' },
      isNewSessionOffered: false,
    });
  });

  it('offers a new session when none is ahead', () => {
    expect(
      selectHomePrimaryAction({ isLoading: false, nextSessionId: null, setlistId: null }),
    ).toEqual({ link: null, isNewSessionOffered: true });
  });

  it('offers nothing while the sessions load', () => {
    expect(
      selectHomePrimaryAction({ isLoading: true, nextSessionId: null, setlistId: null }),
    ).toEqual({ link: null, isNewSessionOffered: false });
  });
});
