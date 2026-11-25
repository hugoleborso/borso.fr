import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { type GearItemDraft, GearItemSheet } from './GearItemSheet';

const BORSO = { id: 'cccccccc-3333-4333-8333-333333333333', firstName: 'Borso', color: '#2d5fa0' };
const COSYN = { id: 'dddddddd-4444-4444-8444-444444444444', firstName: 'Cosyn', color: '#fa8072' };

function renderSheet(initial: GearItemDraft | null = null): GearItemDraft[] {
  const saved: GearItemDraft[] = [];
  render(
    <GearItemSheet
      members={[BORSO, COSYN]}
      initial={initial}
      onSave={async (draft) => {
        saved.push(draft);
        await Promise.resolve();
      }}
      onDelete={null}
      onClose={() => undefined}
    />,
  );
  return saved;
}

// @FollowsBlueprint test-component-render
describe('the gear item sheet', () => {
  afterEach(() => {
    cleanup();
  });

  it('asks who has it with one choice for nobody, one for the venue and one per member', () => {
    renderSheet();
    const group = screen.getByRole('radiogroup', { name: 'Who has it' });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('aria-label')),
    ).toEqual(['To find', 'Asked of the venue', 'Borso has it', 'Cosyn has it']);
    expect(within(group).getByRole('radio', { name: 'To find' })).toHaveProperty('checked', true);
  });

  it('saves the item as held by the member picked', async () => {
    const saved = renderSheet();
    fireEvent.change(screen.getByLabelText('Item'), { target: { value: 'Ampli basse' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Cosyn has it' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0]).toStrictEqual({
      label: 'Ampli basse',
      holding: { status: 'have', memberId: COSYN.id },
    });
  });

  it('refuses a blank label and keeps the sheet open', async () => {
    const saved = renderSheet();
    fireEvent.change(screen.getByLabelText('Item'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Name the item.');
    expect(saved).toStrictEqual([]);
  });

  it('opens an item to edit on its label and its holder, with Save in place of Add', () => {
    renderSheet({ label: 'Sono', holding: { status: 'asked_of_venue', memberId: null } });
    expect(screen.getByRole('dialog', { name: 'Edit the item' })).toBeTruthy();
    expect(screen.getByLabelText('Item')).toHaveProperty('value', 'Sono');
    expect(screen.getByRole('radio', { name: 'Asked of the venue' })).toHaveProperty(
      'checked',
      true,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });
});
