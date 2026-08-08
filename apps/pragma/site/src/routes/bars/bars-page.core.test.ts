import { describe, expect, it, vi } from 'vitest';
import { BLANK_BAR_FORM } from './bar-form.core';
import {
  applyBarWriteIntent,
  type BarRow,
  groupBarsByStatus,
  selectBarWriteIntent,
  selectDragDropIntent,
  selectFormAfterDeletion,
  selectFormForBar,
  selectToggleState,
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

describe('selectFormAfterDeletion', () => {
  const editing = { ...BLANK_BAR_FORM, id: 'bar-1' };

  it('resets the form when the edited bar is deleted', () => {
    expect(selectFormAfterDeletion(editing, 'bar-1', BLANK_BAR_FORM)).toBe(BLANK_BAR_FORM);
  });

  it('keeps the form when another bar is deleted', () => {
    expect(selectFormAfterDeletion(editing, 'bar-2', BLANK_BAR_FORM)).toBe(editing);
  });
});
