import { PLAYER_COLORS, PLAYER_ICONS, PLAYER_NAME_MAX_LENGTH } from '@domain/player-mark.core';
import { MAXIMUM_PLAYERS } from '@domain/round.core';
import { describe, expect, it } from 'vitest';
import {
  canSeatAnother,
  canStartGame,
  readRegulars,
  rememberRegulars,
  replacePlayer,
  type RosterPlayer,
  seatPlayer,
  selectAbsentRegulars,
  selectFreeMark,
  selectRename,
  trimPlayerName,
  unseatPlayer,
  selectSeatsToCreate,
  withAccountFirst,
} from './roster.core';

const HUGO: RosterPlayer = { name: 'Hugo', icon: 'skull', color: 'gold' };
const LEA: RosterPlayer = { name: 'Léa', icon: 'parrot', color: 'lagoon' };
const MAX: RosterPlayer = { name: 'Max', icon: 'anchor', color: 'coral' };

function aFullTable(): readonly RosterPlayer[] {
  return Array.from({ length: MAXIMUM_PLAYERS }, (_, seat) => ({
    name: `Player ${seat}`,
    icon: PLAYER_ICONS[seat] ?? 'skull',
    color: PLAYER_COLORS[seat] ?? 'gold',
  }));
}

// @FollowsBlueprint test-pure-unit
describe('readRegulars', () => {
  it('reads the regulars a previous visit stored', () => {
    expect(readRegulars(JSON.stringify([HUGO, LEA]))).toEqual([HUGO, LEA]);
  });

  it('answers no regular for nothing stored', () => {
    expect(readRegulars(null)).toEqual([]);
  });

  it('answers no regular for a stored value of another shape', () => {
    expect(readRegulars(JSON.stringify([{ name: 'Hugo', icon: 'monkey', color: 'gold' }]))).toEqual(
      [],
    );
  });

  it('answers no regular for text that is not JSON', () => {
    expect(readRegulars('{')).toEqual([]);
  });
});

describe('rememberRegulars', () => {
  it('puts the table first and keeps the other regulars after it', () => {
    const renamed: RosterPlayer = { ...HUGO, icon: 'crown' };
    expect(rememberRegulars([HUGO, MAX], [renamed, LEA])).toEqual([renamed, LEA, MAX]);
  });

  it('keeps at most sixteen regulars', () => {
    const many = Array.from({ length: 20 }, (_, index) => ({ ...HUGO, name: `P${index}` }));
    expect(rememberRegulars(many, [])).toHaveLength(16);
  });
});

describe('selectAbsentRegulars', () => {
  it('leaves out the regulars already at the table, whatever the case of their name', () => {
    expect(selectAbsentRegulars([HUGO, LEA, MAX], [{ ...LEA, name: 'LÉA' }])).toEqual([HUGO, MAX]);
  });
});

describe('trimPlayerName', () => {
  it('drops the spaces around a name', () => {
    expect(trimPlayerName('  Hugo ')).toBe('Hugo');
  });

  it('cuts a name at the longest the API accepts', () => {
    expect(trimPlayerName('x'.repeat(40))).toHaveLength(PLAYER_NAME_MAX_LENGTH);
  });
});

describe('selectFreeMark', () => {
  it('answers the first icon and colour nobody at the table has', () => {
    expect(selectFreeMark([HUGO, { ...LEA, color: 'gold' }])).toEqual({
      icon: 'anchor',
      color: 'lagoon',
    });
  });

  it("answers the first free icon rather than the next seat's", () => {
    expect(selectFreeMark([{ ...HUGO, icon: 'parrot' }]).icon).toBe('skull');
  });

  it('falls back to the mark of the next seat once every icon and colour is taken', () => {
    const everyMark = PLAYER_ICONS.map((icon, seat) => ({
      name: `P${seat}`,
      icon,
      color: PLAYER_COLORS[seat % PLAYER_COLORS.length] ?? 'gold',
    }));
    expect(selectFreeMark(everyMark)).toEqual({ icon: 'skull', color: 'sky' });
  });
});

describe('canSeatAnother and canStartGame', () => {
  it('lets a table of two take another player but not start', () => {
    expect(canSeatAnother([HUGO, LEA])).toBe(true);
    expect(canStartGame([HUGO, LEA])).toBe(false);
  });

  it('lets a table of three start', () => {
    expect(canStartGame([HUGO, LEA, MAX])).toBe(true);
  });

  it('refuses a ninth player', () => {
    expect(canSeatAnother(aFullTable())).toBe(false);
  });
});

describe('seatPlayer', () => {
  it('adds a new player at the end of the table', () => {
    expect(seatPlayer([HUGO], LEA)).toEqual([HUGO, LEA]);
  });

  it('refuses a name already at the table', () => {
    expect(seatPlayer([HUGO], { ...LEA, name: 'hugo' })).toEqual([HUGO]);
  });

  it('refuses an empty name', () => {
    expect(seatPlayer([HUGO], { ...LEA, name: '' })).toEqual([HUGO]);
  });

  it('refuses a player once the table is full', () => {
    expect(seatPlayer(aFullTable(), LEA)).toHaveLength(MAXIMUM_PLAYERS);
  });
});

describe('replacePlayer and unseatPlayer', () => {
  it('replaces the player at the seat it names', () => {
    expect(replacePlayer([HUGO, LEA], 1, MAX)).toEqual([HUGO, MAX]);
  });

  it('removes the player at the seat it names', () => {
    expect(unseatPlayer([HUGO, LEA, MAX], 1)).toEqual([HUGO, MAX]);
  });
});

describe('selectRename', () => {
  it('answers the trimmed new name', () => {
    expect(selectRename(' Léa ', 'Hugo')).toBe('Léa');
  });

  it('answers null for an empty name or the same name', () => {
    expect(selectRename('  ', 'Hugo')).toBeNull();
    expect(selectRename('Hugo', 'Hugo')).toBeNull();
  });
});

describe('withAccountFirst', () => {
  it('leaves the table alone for a guest', () => {
    expect(withAccountFirst(null, [HUGO, LEA])).toEqual([HUGO, LEA]);
  });

  it('seats the signed-in player first, once', () => {
    expect(withAccountFirst(MAX, [HUGO, { ...MAX, color: 'sky' }])).toEqual([MAX, HUGO]);
  });
});

describe('selectSeatsToCreate', () => {
  it('sends a guest table as names and marks only', () => {
    expect(selectSeatsToCreate([HUGO, LEA], false)).toStrictEqual([HUGO, LEA]);
  });

  it('marks the first seat as the signed-in player, and drops the account id it carries', () => {
    const account = { ...MAX, id: '927ab190-0000-4000-8000-000000000000' };
    expect(selectSeatsToCreate([account, HUGO], true)).toStrictEqual([
      { ...MAX, isMe: true },
      HUGO,
    ]);
  });
});
