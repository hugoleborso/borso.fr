import { describe, expect, it } from 'vitest';
import {
  fileFriction,
  readInventoryLines,
  readKaizenLines,
  readWalls,
  selectWallProblems,
  type FrictionLine,
  type Wall,
} from './working-conditions.core';

const WALLS_MARKDOWN = `# Walls

- \`shared-database\` · Build · Agents share one database
  match: one local postgres |  DROP each other |
- \`no-terms\` · Observe · A wall nobody wrote terms for
- \`last\` · Ship · The last wall
  match: conflicted
`;

function buildLine(text: string, writer = 'main', task = 'pragma/a'): FrictionLine {
  return { task, writer, text };
}

describe('readWalls', () => {
  it('reads each wall with its lower-cased terms, and a wall with no match line as having none', () => {
    expect(readWalls(WALLS_MARKDOWN)).toEqual([
      {
        id: 'shared-database',
        area: 'Build',
        description: 'Agents share one database',
        terms: ['one local postgres', 'drop each other'],
      },
      { id: 'no-terms', area: 'Observe', description: 'A wall nobody wrote terms for', terms: [] },
      { id: 'last', area: 'Ship', description: 'The last wall', terms: ['conflicted'] },
    ]);
  });

  it('trims a description and a term, and ignores a match line before any wall', () => {
    const markdown =
      '  match: orphan\n- `spaced` · Build · Padded   \n  match:   alpha   |beta  \n';
    expect(readWalls(markdown)).toEqual([
      { id: 'spaced', area: 'Build', description: 'Padded', terms: ['alpha', 'beta'] },
    ]);
    expect(readWalls('  match: orphan\n')).toEqual([]);
  });

  it('reads a wall on the last line as having no terms', () => {
    expect(readWalls('- `end` · Build · At the end')).toEqual([
      { id: 'end', area: 'Build', description: 'At the end', terms: [] },
    ]);
  });
});

describe('readKaizenLines', () => {
  it('reads the writer and the text of each logged line', () => {
    const markdown =
      '# KAIZEN\n\n- [17:31] `hook:no-broad-kill` reached for pkill \n- not a line\n- [08:56] `main` a second line\n';
    expect(readKaizenLines('meta/x', markdown)).toEqual([
      { task: 'meta/x', writer: 'hook:no-broad-kill', text: 'reached for pkill' },
      { task: 'meta/x', writer: 'main', text: 'a second line' },
    ]);
  });
});

describe('readInventoryLines', () => {
  it('reads the friction column of each numbered row, with the writer when the table has one', () => {
    const markdown = `| # | When | Writer | Friction | Decision |
| --- | --- | --- | --- | --- |
| 01 | conception | \`plan\` | the filter matched no project | dantotsu |
| 02 | implementation |  | an unnamed writer | no-op |
not a table`;
    expect(readInventoryLines('meta/lessons', markdown)).toEqual([
      { task: 'meta/lessons', writer: 'plan', text: 'the filter matched no project' },
      { task: 'meta/lessons', writer: '', text: 'an unnamed writer' },
    ]);
  });

  it('names the writer inventory when the table has no writer column', () => {
    const markdown = '| # | When | Friction |\n| --- | --- | --- |\n| 1 | ci | a slow suite |\n';
    expect(readInventoryLines('t', markdown)).toEqual([
      { task: 't', writer: 'inventory', text: 'a slow suite' },
    ]);
  });

  it('reads a row shorter than its header as an empty writer and text', () => {
    expect(readInventoryLines('t', '| # | Writer | When | Friction |\n| 4 |\n')).toEqual([
      { task: 't', writer: '', text: '' },
    ]);
  });

  it('reads a friction or a writer column that comes first', () => {
    expect(readInventoryLines('t', '| Friction | When |\n| 7 | ci |\n')).toEqual([
      { task: 't', writer: 'inventory', text: '7' },
    ]);
    expect(readInventoryLines('t', '| Writer | Friction |\n| 12 | a text |\n')).toEqual([
      { task: 't', writer: '12', text: 'a text' },
    ]);
  });

  it('reads no row before a friction header', () => {
    expect(readInventoryLines('t', '| 1 | ci | a slow suite |\n')).toEqual([]);
  });

  it('reads an empty friction cell as an empty text', () => {
    expect(readInventoryLines('t', '| # | Friction |\n| 3 | |\n')).toEqual([
      { task: 't', writer: 'inventory', text: '' },
    ]);
  });
});

function readTestWalls(): readonly Wall[] {
  return readWalls(WALLS_MARKDOWN);
}

describe('fileFriction', () => {
  it('files each line under the first wall whose term it contains, and counts agents and tasks', () => {
    const board = fileFriction(
      [
        buildLine('Two agents share ONE LOCAL POSTGRES'),
        buildLine('they drop each other tables', 'feat-a'),
        buildLine('one local postgres again', 'main', 'pragma/b'),
        buildLine('a conflicted pull request'),
        buildLine('nothing matches this'),
      ],
      readTestWalls(),
    );
    expect(
      board.walls.map((filed) => [filed.wall.id, filed.agents, filed.tasks, filed.lines.length]),
    ).toEqual([
      ['shared-database', 3, 2, 3],
      ['last', 1, 1, 1],
    ]);
    expect(board.unfiled).toEqual([buildLine('nothing matches this')]);
  });

  it('matches the writer too, so a hook named by a wall is filed there', () => {
    const hookWall: Wall = {
      id: 'hooks',
      area: 'Build',
      description: 'Hooks refuse',
      terms: ['no-broad-kill'],
    };
    const board = fileFriction([buildLine('reached for pkill', 'hook:no-broad-kill')], [hookWall]);
    expect(board.walls[0]?.wall.id).toBe('hooks');
  });

  it('files a hook line no wall names under the hook itself', () => {
    const board = fileFriction(
      [buildLine('piped a push', 'hook:no-swallowed-push')],
      readTestWalls(),
    );
    expect(board.walls).toEqual([
      {
        wall: {
          id: 'hook:no-swallowed-push',
          area: 'Build',
          description: 'A guard hook refused a command',
          terms: [],
        },
        lines: [buildLine('piped a push', 'hook:no-swallowed-push')],
        agents: 1,
        tasks: 1,
      },
    ]);
  });

  it('counts a line repeated in the same task once', () => {
    const board = fileFriction(
      [buildLine('a conflicted pr'), buildLine('a conflicted pr')],
      readTestWalls(),
    );
    expect(board.walls[0]?.lines).toHaveLength(1);
  });

  it('ranks walls by agents, then tasks, then id', () => {
    const rankWalls: readonly Wall[] = [
      { id: 'b-wall', area: 'Build', description: 'b', terms: ['bee'] },
      { id: 'a-wall', area: 'Build', description: 'a', terms: ['ay'] },
      { id: 'c-wall', area: 'Build', description: 'c', terms: ['sea'] },
    ];
    const board = fileFriction(
      [
        buildLine('bee', 'one', 'task-1'),
        buildLine('ay', 'one', 'task-1'),
        buildLine('sea', 'one', 'task-1'),
        buildLine('sea', 'one', 'task-2'),
        buildLine('bee', 'two', 'task-1'),
        buildLine('bee', 'three', 'task-1'),
      ],
      rankWalls,
    );
    expect(board.walls.map((filed) => filed.wall.id)).toEqual(['b-wall', 'c-wall', 'a-wall']);
    const tied = fileFriction([buildLine('bee'), buildLine('ay')], rankWalls);
    expect(tied.walls.map((filed) => filed.wall.id)).toEqual(['a-wall', 'b-wall']);
  });
});

describe('selectWallProblems', () => {
  it('names a duplicated id, an unknown area, a wall with no terms and a wall that files nothing', () => {
    const walls: readonly Wall[] = [
      { id: 'twice', area: 'Build', description: 'x', terms: ['hit'] },
      { id: 'twice', area: 'Build', description: 'x', terms: ['hit'] },
      { id: 'elsewhere', area: 'Deploy', description: 'x', terms: ['hit'] },
      { id: 'empty', area: 'Observe', description: 'x', terms: [] },
      { id: 'idle', area: 'Ship', description: 'x', terms: ['never'] },
    ];
    const board = fileFriction([buildLine('a hit')], walls);
    expect(selectWallProblems(walls, board)).toEqual([
      'wall twice is declared twice',
      'wall elsewhere is filed under Deploy, not Build, Observe, Ship',
      'wall elsewhere files no friction line; fix its terms or remove it',
      'wall empty has no match: terms',
      'wall idle files no friction line; fix its terms or remove it',
    ]);
  });

  it('accepts walls that each file a line', () => {
    const walls = readWalls('- `one` · Build · x\n  match: hit\n');
    expect(selectWallProblems(walls, fileFriction([buildLine('a hit')], walls))).toEqual([]);
  });
});
