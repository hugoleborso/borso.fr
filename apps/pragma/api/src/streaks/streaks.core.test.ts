import { describe, expect, it } from 'vitest';
import {
  buildMemberFlames,
  buildOwnFlame,
  buildStreaksView,
  collectSessionDays,
  firstLookbackDay,
  projectStreaksForTool,
} from './streaks.core';

const TODAY = '2026-10-29';
const YESTERDAY = '2026-10-28';
const LEA = { id: 'member-lea', firstName: 'Léa', color: '#e0533a' };
const TOM = { id: 'member-tom', firstName: 'Tom', color: '#3a7be0' };
const NO_SESSION = new Set<string>();
const LEA_ROW = { memberId: LEA.id, firstName: LEA.firstName, color: LEA.color };
const TOM_ROW = { memberId: TOM.id, firstName: TOM.firstName, color: TOM.color };

// @FollowsBlueprint test-pure-unit
describe('buildStreaksView', () => {
  it('forms each member’s days from their studies and every session', () => {
    const view = buildStreaksView({
      today: TODAY,
      memberId: LEA.id,
      members: [LEA, TOM],
      studies: [{ memberId: LEA.id, studiedOn: TODAY }],
      sessionDays: new Set([YESTERDAY]),
    });
    expect(view).toEqual({
      today: TODAY,
      mine: { days: 2, isTodayCounted: true, jokersLeftThisWeek: 3 },
      band: { days: 2, isTodayCounted: true },
      members: [
        {
          memberId: LEA.id,
          firstName: 'Léa',
          color: '#e0533a',
          flame: { days: 2, isTodayCounted: true, jokersLeftThisWeek: 3 },
        },
        {
          memberId: TOM.id,
          firstName: 'Tom',
          color: '#3a7be0',
          flame: { days: 1, isTodayCounted: false, jokersLeftThisWeek: 3 },
        },
      ],
    });
  });

  it('counts a band day when any one member studied it', () => {
    const view = buildStreaksView({
      today: TODAY,
      memberId: TOM.id,
      members: [LEA, TOM],
      studies: [
        { memberId: LEA.id, studiedOn: TODAY },
        { memberId: TOM.id, studiedOn: YESTERDAY },
      ],
      sessionDays: NO_SESSION,
    });
    expect(view.band).toEqual({ days: 2, isTodayCounted: true });
    expect(view.mine).toEqual({ days: 1, isTodayCounted: false, jokersLeftThisWeek: 3 });
  });

  it('ignores the study of a member who was deleted', () => {
    const view = buildStreaksView({
      today: TODAY,
      memberId: LEA.id,
      members: [LEA],
      studies: [{ memberId: 'member-gone', studiedOn: TODAY }],
      sessionDays: NO_SESSION,
    });
    expect(view.band).toEqual({ days: 0, isTodayCounted: false });
    expect(view.members.map((member) => member.memberId)).toEqual([LEA.id]);
  });

  it('answers the empty flame for a signed-in member who is not in the band', () => {
    const view = buildStreaksView({
      today: TODAY,
      memberId: 'member-unknown',
      members: [LEA],
      studies: [{ memberId: LEA.id, studiedOn: TODAY }],
      sessionDays: new Set([TODAY]),
    });
    expect(view.mine).toEqual({ days: 0, isTodayCounted: false, jokersLeftThisWeek: 3 });
  });
});

describe('buildMemberFlames', () => {
  it('answers every member’s flame without a signed-in member', () => {
    const flames = buildMemberFlames({
      today: TODAY,
      members: [LEA, TOM],
      studies: [{ memberId: TOM.id, studiedOn: TODAY }],
      sessionDays: NO_SESSION,
    });
    expect(flames).toEqual([
      { ...LEA_ROW, flame: { days: 0, isTodayCounted: false, jokersLeftThisWeek: 3 } },
      { ...TOM_ROW, flame: { days: 1, isTodayCounted: true, jokersLeftThisWeek: 3 } },
    ]);
  });
});

describe('buildOwnFlame', () => {
  it('reads only the member’s own studies, with every session', () => {
    expect(
      buildOwnFlame({
        today: TODAY,
        memberId: TOM.id,
        studies: [
          { memberId: LEA.id, studiedOn: TODAY },
          { memberId: TOM.id, studiedOn: YESTERDAY },
        ],
        sessionDays: new Set(['2026-10-27']),
      }),
    ).toEqual({ days: 2, isTodayCounted: false, jokersLeftThisWeek: 3 });
  });
});

describe('collectSessionDays', () => {
  it('keeps the Paris day of each session from the first day to today', () => {
    const firstDay = '2025-09-24';
    const days = collectSessionDays(
      [
        { date: new Date('2026-10-28T23:30:00Z') },
        { date: new Date('2026-10-28T22:30:00Z') },
        { date: new Date('2025-09-24T10:00:00Z') },
        { date: new Date('2025-09-23T10:00:00Z') },
      ],
      firstDay,
      TODAY,
    );
    expect([...days].sort()).toEqual([firstDay, YESTERDAY, TODAY]);
  });

  it('leaves out a session dated after today', () => {
    expect(
      collectSessionDays([{ date: new Date('2026-10-30T18:00:00Z') }], '2025-09-24', TODAY).size,
    ).toBe(0);
  });
});

describe('projectStreaksForTool', () => {
  it('keeps both flames and each member’s count, without ids or colours', () => {
    const view = buildStreaksView({
      today: TODAY,
      memberId: LEA.id,
      members: [LEA],
      studies: [{ memberId: LEA.id, studiedOn: TODAY }],
      sessionDays: NO_SESSION,
    });
    expect(projectStreaksForTool(view)).toEqual({
      mine: { days: 1, isTodayCounted: true, jokersLeftThisWeek: 3 },
      band: { days: 1, isTodayCounted: true },
      members: [{ firstName: 'Léa', days: 1, isTodayCounted: true }],
    });
  });
});

describe('firstLookbackDay', () => {
  it('reads 400 calendar days back from today', () => {
    expect(firstLookbackDay(TODAY)).toBe('2025-09-24');
  });
});
