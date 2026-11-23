import { suggestAvatar } from '@domain/pirate-avatar.core';
import { PLAYER_COLORS, PLAYER_ICONS, PLAYER_NAME_MAX_LENGTH } from '@domain/player-mark.core';
import { MAXIMUM_PLAYERS } from '@domain/round.core';
import { describe, expect, it } from 'vitest';
import {
  canSeatAnother,
  canStartGame,
  readLastPirate,
  readRegulars,
  rememberRegulars,
  replacePlayer,
  type RosterPlayer,
  seatAccount,
  seatPlayer,
  selectAbsentRegulars,
  selectFreeMark,
  selectNewSeatAvatar,
  selectRename,
  trimPlayerName,
  unseatPlayer,
  selectSeatsToCreate,
  withAccountFirst,
} from './roster.core';

const HUGO: RosterPlayer = { name: 'Hugo', icon: 'skull', color: 'gold', avatar: suggestAvatar(0) };
const LEA: RosterPlayer = { name: 'Léa', icon: 'bird', color: 'ice', avatar: suggestAvatar(1) };
const MAX: RosterPlayer = {
  name: 'Max',
  icon: 'anchor',
  color: 'magenta',
  avatar: suggestAvatar(2),
};

function aFullTable(): readonly RosterPlayer[] {
  return Array.from({ length: MAXIMUM_PLAYERS }, (_, seat) => ({
    name: `Player ${seat}`,
    icon: PLAYER_ICONS[seat] ?? 'skull',
    color: PLAYER_COLORS[seat] ?? 'gold',
    avatar: suggestAvatar(seat),
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

  it('dresses a regular stored before pirates existed as the pirate of their place in the list', () => {
    const stored = JSON.stringify([
      { name: 'Hugo', icon: 'skull', color: 'gold' },
      { name: 'Léa', icon: 'bird', color: 'ice' },
    ]);
    expect(readRegulars(stored).map((regular) => regular.avatar)).toEqual([
      suggestAvatar(0),
      suggestAvatar(1),
    ]);
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
      color: 'sky',
    });
  });

  it("answers the first free icon rather than the next seat's", () => {
    expect(selectFreeMark([{ ...HUGO, icon: 'bird' }]).icon).toBe('skull');
  });

  it('falls back to the mark of the next seat once every icon and colour is taken', () => {
    const everyMark = PLAYER_ICONS.map((icon, seat) => ({
      name: `P${seat}`,
      icon,
      color: PLAYER_COLORS[seat % PLAYER_COLORS.length] ?? 'gold',
      avatar: suggestAvatar(seat),
    }));
    expect(selectFreeMark(everyMark)).toEqual({ icon: 'skull', color: 'amethyst' });
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
  it('sends a guest table as names, marks and pirates only', () => {
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

const CAPTAIN = { ...suggestAvatar(5), companion: 'parrot', headwear: 'tricorne' } as const;

describe('readLastPirate', () => {
  it('reads back the last pirate this phone built', () => {
    expect(readLastPirate(JSON.stringify(CAPTAIN))).toEqual(CAPTAIN);
  });

  it('answers no pirate for nothing stored, another shape, or text that is not JSON', () => {
    expect(readLastPirate(null)).toBeNull();
    expect(readLastPirate(JSON.stringify({ ...CAPTAIN, hair: 'mohawk' }))).toBeNull();
    expect(readLastPirate('{')).toBeNull();
  });
});

describe('selectNewSeatAvatar', () => {
  it('dresses a new seat as the last pirate this phone built', () => {
    expect(selectNewSeatAvatar(CAPTAIN, [HUGO, LEA])).toEqual(CAPTAIN);
  });

  it('suggests the pirate of the seat once somebody at the table already wears the last one', () => {
    expect(selectNewSeatAvatar(CAPTAIN, [HUGO, { ...LEA, avatar: CAPTAIN }])).toEqual(
      suggestAvatar(2),
    );
  });

  it('suggests the pirate of the seat on a phone that never built one', () => {
    expect(selectNewSeatAvatar(null, [HUGO])).toEqual(suggestAvatar(1));
  });
});

describe('seatAccount', () => {
  const account = { name: 'Max', icon: 'anchor', color: 'magenta' } as const;

  it('seats nobody for a guest', () => {
    expect(seatAccount(null, [MAX])).toBeNull();
  });

  it('dresses the account as the regular of the same name, whatever its case', () => {
    expect(seatAccount({ ...account, name: 'MAX' }, [HUGO, { ...MAX, avatar: CAPTAIN }])).toEqual({
      name: 'MAX',
      icon: 'anchor',
      color: 'magenta',
      avatar: CAPTAIN,
    });
  });

  it('dresses an account no regular matches as the pirate of the first seat', () => {
    expect(seatAccount(account, [HUGO])?.avatar).toEqual(suggestAvatar(0));
  });
});
