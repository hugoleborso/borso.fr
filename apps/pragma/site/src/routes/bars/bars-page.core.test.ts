import { describe, expect, it, vi } from 'vitest';
import { BLANK_BAR_FORM } from './bar-form.core';
import {
  applyBarWriteIntent,
  type BarRow,
  buildKanbanCardsByStatus,
  groupBarsByStatus,
  selectBarWriteIntent,
  selectDragDropIntent,
  buildBarFormKey,
  isBarBeingEdited,
  selectFormAfterDeletion,
  selectFormForBar,
  selectToggleState,
  selectVisibleBarsView,
  sortBarsByName,
} from './bars-page.core';

function buildBar(overrides: Partial<BarRow> & { id: string; name: string }): BarRow {
  return {
    status: 'lead',
    notes: '',
    city: null,
    capacity: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    lastInteractionAt: null,
    ...overrides,
  };
}

const PAYLOAD = {
  name: 'Le Zinc',
  status: 'lead',
  notes: '',
  city: null,
  capacity: null,
  contactName: null,
  contactEmail: null,
  contactPhone: null,
} as const;

// @FollowsBlueprint test-pure-unit
describe('selectToggleState', () => {
  it('is active for the current view', () => {
    expect(selectToggleState('list', 'list')).toBe('active');
  });

  it('is inactive for the other view', () => {
    expect(selectToggleState('list', 'kanban')).toBe('inactive');
  });
});

describe('groupBarsByStatus', () => {
  it('puts every bar in its own column and leaves the others empty', () => {
    const grouped = groupBarsByStatus([
      buildBar({ id: '1', name: 'A', status: 'lead' }),
      buildBar({ id: '2', name: 'B', status: 'booked' }),
      buildBar({ id: '3', name: 'C', status: 'lead' }),
    ]);
    expect(grouped.lead.map((bar) => bar.id)).toEqual(['1', '3']);
    expect(grouped.booked.map((bar) => bar.id)).toEqual(['2']);
    expect(grouped.contacted).toEqual([]);
    expect(grouped.played).toEqual([]);
    expect(grouped.cold).toEqual([]);
  });
});

describe('buildKanbanCardsByStatus', () => {
  const grouped = groupBarsByStatus([
    buildBar({ id: 'fresh-bar', name: 'Le Zinc', city: 'Lyon', capacity: 90 }),
    buildBar({ id: 'stale-bar', name: 'Le Klub', status: 'booked', contactName: 'Ana' }),
  ]);

  it('projects each bar into the fields the board shows', () => {
    const cards = buildKanbanCardsByStatus(grouped, () => false);

    expect(cards.lead).toStrictEqual([
      {
        id: 'fresh-bar',
        name: 'Le Zinc',
        city: 'Lyon',
        capacity: 90,
        contactName: null,
        isStale: false,
      },
    ]);
  });

  it('derives staleness through the caller, which owns the clock', () => {
    const cards = buildKanbanCardsByStatus(grouped, (bar) => bar.id === 'stale-bar');

    expect(cards.booked[0]?.isStale).toBe(true);
    expect(cards.lead[0]?.isStale).toBe(false);
  });

  it('gives every status a column, including the empty ones', () => {
    const cards = buildKanbanCardsByStatus(grouped, () => false);

    expect(Object.keys(cards)).toStrictEqual(['lead', 'contacted', 'booked', 'played', 'cold']);
    expect(cards.cold).toStrictEqual([]);
  });
});

describe('sortBarsByName', () => {
  it('orders by name without mutating the input', () => {
    const bars = [buildBar({ id: '1', name: 'Zinc' }), buildBar({ id: '2', name: 'Apollo' })];
    expect(sortBarsByName(bars).map((bar) => bar.name)).toEqual(['Apollo', 'Zinc']);
    expect(bars.map((bar) => bar.name)).toEqual(['Zinc', 'Apollo']);
  });
});

describe('selectBarWriteIntent', () => {
  it('skips an empty name', () => {
    expect(selectBarWriteIntent(null, { ...PAYLOAD, name: '' })).toEqual({ kind: 'skip' });
  });

  it('creates when there is no identifier', () => {
    expect(selectBarWriteIntent(null, PAYLOAD)).toEqual({ kind: 'create', payload: PAYLOAD });
  });

  it('updates when there is an identifier', () => {
    expect(selectBarWriteIntent('bar-1', PAYLOAD)).toEqual({
      kind: 'update',
      payload: { ...PAYLOAD, id: 'bar-1' },
    });
  });
});

describe('applyBarWriteIntent', () => {
  it('calls exactly the branch the intent names', () => {
    const visitor = {
      skip: vi.fn(() => 'skipped'),
      create: vi.fn(() => 'created'),
      update: vi.fn(() => 'updated'),
    };
    expect(applyBarWriteIntent({ kind: 'skip' }, visitor)).toBe('skipped');
    expect(applyBarWriteIntent({ kind: 'create', payload: PAYLOAD }, visitor)).toBe('created');
    expect(
      applyBarWriteIntent({ kind: 'update', payload: { ...PAYLOAD, id: 'bar-1' } }, visitor),
    ).toBe('updated');
    expect(visitor.create).toHaveBeenCalledWith(PAYLOAD);
    expect(visitor.update).toHaveBeenCalledWith({ ...PAYLOAD, id: 'bar-1' });
  });
});

describe('selectDragDropIntent', () => {
  it('ignores an empty drag payload', () => {
    expect(selectDragDropIntent('')).toBe('ignore');
  });

  it('moves a bar when the drag payload carries an identifier', () => {
    expect(selectDragDropIntent('bar-1')).toBe('move');
  });
});

describe('selectFormForBar', () => {
  const bars = [buildBar({ id: 'bar-1', name: 'Le Zinc', capacity: 90 })];

  it('loads the selected bar into the form', () => {
    expect(selectFormForBar(bars, 'bar-1', BLANK_BAR_FORM)).toMatchObject({
      id: 'bar-1',
      name: 'Le Zinc',
      capacity: '90',
    });
  });

  it('keeps the current form when the identifier is unknown', () => {
    expect(selectFormForBar(bars, 'missing', BLANK_BAR_FORM)).toBe(BLANK_BAR_FORM);
  });
});

describe('isBarBeingEdited', () => {
  const editing = { ...BLANK_BAR_FORM, id: 'bar-1' };

  it('marks the row the form holds', () => {
    expect(isBarBeingEdited('bar-1', editing)).toBe(true);
  });

  it('leaves every other row unmarked', () => {
    expect(isBarBeingEdited('bar-2', editing)).toBe(false);
  });

  it('marks no row while the form is blank', () => {
    expect(isBarBeingEdited('bar-1', BLANK_BAR_FORM)).toBe(false);
  });
});

describe('selectFormAfterDeletion', () => {
  const editing = { ...BLANK_BAR_FORM, id: 'bar-1' };

  it('resets the form when the edited bar is deleted', () => {
    expect(selectFormAfterDeletion(editing, 'bar-1', BLANK_BAR_FORM)).toBe(BLANK_BAR_FORM);
  });

  it('keeps the form when another bar is deleted', () => {
    expect(selectFormAfterDeletion(editing, 'bar-2', BLANK_BAR_FORM)).toBe(editing);
  });
});

describe('buildBarFormKey', () => {
  it('keys an existing bar on its identifier', () => {
    expect(buildBarFormKey({ ...BLANK_BAR_FORM, id: 'bar-1' }, 0)).toBe('bar-1-0');
  });

  it('gives the blank form a new key after each write, so it remounts empty', () => {
    expect(buildBarFormKey(BLANK_BAR_FORM, 0)).toBe('new-0');
    expect(buildBarFormKey(BLANK_BAR_FORM, 1)).toBe('new-1');
  });
});

describe('selectVisibleBarsView', () => {
  it('honours the chosen view on a wide viewport', () => {
    expect(selectVisibleBarsView('kanban', false)).toBe('kanban');
  });

  it('falls back to the list on a narrow one, where drag and drop cannot fire', () => {
    expect(selectVisibleBarsView('kanban', true)).toBe('list');
  });

  it('leaves the list alone either way', () => {
    expect(selectVisibleBarsView('list', true)).toBe('list');
  });
});
