import { describe, expect, it, vi } from 'vitest';
import {
  applyMemberWriteIntent,
  buildMemberFormKey,
  buildMemberFormValues,
  DEFAULT_MEMBER_COLOR,
  type MemberSelection,
  selectInstrumentListState,
  selectMemberFormMode,
  selectMemberWriteIntent,
  selectSelectionAfterDeletion,
  sortInstrumentsByName,
  sortMembersByFirstName,
  toggleInstrumentAssignment,
} from './members-page.core';

const ADA: MemberSelection = { id: 'ada-id', firstName: 'Ada', color: '#112233' };

describe('sortMembersByFirstName', () => {
  it('orders by first name without mutating the input', () => {
    const members = [
      { id: '1', firstName: 'Zoe', color: '#000000' },
      { id: '2', firstName: 'Ada', color: '#000000' },
    ];
    expect(sortMembersByFirstName(members).map((member) => member.firstName)).toEqual([
      'Ada',
      'Zoe',
    ]);
    expect(members[0]?.firstName).toBe('Zoe');
  });
});

describe('sortInstrumentsByName', () => {
  it('orders by name', () => {
    expect(
      sortInstrumentsByName([
        { id: '1', name: 'Keys' },
        { id: '2', name: 'Bass' },
      ]).map((instrument) => instrument.name),
    ).toEqual(['Bass', 'Keys']);
  });
});

describe('selectMemberFormMode', () => {
  it('creates without a selection', () => {
    expect(selectMemberFormMode(null)).toBe('create');
  });

  it('edits with a selection', () => {
    expect(selectMemberFormMode(ADA)).toBe('edit');
  });
});

describe('buildMemberFormValues', () => {
  it('starts blank with the default colour', () => {
    expect(buildMemberFormValues(null)).toEqual({
      firstName: '',
      color: DEFAULT_MEMBER_COLOR,
    });
  });

  it('starts from the selected member', () => {
    expect(buildMemberFormValues(ADA)).toEqual({ firstName: 'Ada', color: '#112233' });
  });
});

describe('buildMemberFormKey', () => {
  it('is a stable key for the create form', () => {
    expect(buildMemberFormKey(null)).toBe('new-member');
  });

  it('is the member identifier while editing', () => {
    expect(buildMemberFormKey(ADA)).toBe('ada-id');
  });
});

describe('selectInstrumentListState', () => {
  it('is empty with no instruments', () => {
    expect(selectInstrumentListState([])).toBe('empty');
  });

  it('is filled with at least one instrument', () => {
    expect(selectInstrumentListState([{ id: '1', name: 'Bass' }])).toBe('filled');
  });
});

describe('toggleInstrumentAssignment', () => {
  it('adds an unassigned instrument', () => {
    expect(toggleInstrumentAssignment(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('removes an assigned instrument', () => {
    expect(toggleInstrumentAssignment(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('selectSelectionAfterDeletion', () => {
  it('clears the selection when the selected member is deleted', () => {
    expect(selectSelectionAfterDeletion(ADA, 'ada-id')).toBeNull();
  });

  it('keeps the selection when another member is deleted', () => {
    expect(selectSelectionAfterDeletion(ADA, 'bob-id')).toBe(ADA);
  });

  it('stays null when nothing is selected', () => {
    expect(selectSelectionAfterDeletion(null, 'ada-id')).toBeNull();
  });
});

describe('selectMemberWriteIntent', () => {
  it('skips a blank name', () => {
    expect(selectMemberWriteIntent(null, { firstName: '   ', color: '#000000' })).toEqual({
      kind: 'skip',
    });
  });

  it('creates when nothing is selected, trimming the name', () => {
    expect(selectMemberWriteIntent(null, { firstName: ' Ada ', color: '#000000' })).toEqual({
      kind: 'create',
      firstName: 'Ada',
      color: '#000000',
    });
  });

  it('updates the selected member', () => {
    expect(selectMemberWriteIntent(ADA, { firstName: 'Ada B', color: '#ffffff' })).toEqual({
      kind: 'update',
      id: 'ada-id',
      firstName: 'Ada B',
      color: '#ffffff',
    });
  });
});

describe('applyMemberWriteIntent', () => {
  it('calls exactly the branch the intent names', () => {
    const visitor = {
      skip: vi.fn(() => 'skipped'),
      create: vi.fn(() => 'created'),
      update: vi.fn(() => 'updated'),
    };
    expect(applyMemberWriteIntent({ kind: 'skip' }, visitor)).toBe('skipped');
    expect(
      applyMemberWriteIntent({ kind: 'create', firstName: 'Ada', color: '#000000' }, visitor),
    ).toBe('created');
    expect(
      applyMemberWriteIntent(
        { kind: 'update', id: 'ada-id', firstName: 'Ada', color: '#000000' },
        visitor,
      ),
    ).toBe('updated');
    expect(visitor.create).toHaveBeenCalledWith({ firstName: 'Ada', color: '#000000' });
    expect(visitor.update).toHaveBeenCalledWith({
      id: 'ada-id',
      firstName: 'Ada',
      color: '#000000',
    });
  });
});
