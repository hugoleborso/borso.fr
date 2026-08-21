import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { MemberEditForm } from './MemberEditForm';
import {
  type MemberFormValues,
  DEFAULT_MEMBER_COLOR,
} from '../../routes/members/members-page.core';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const INSTRUMENTS = [
  { id: 'bass-id', name: 'Bass' },
  { id: 'keys-id', name: 'Keys' },
];

const BLANK_VALUES: MemberFormValues = { firstName: '', color: DEFAULT_MEMBER_COLOR };

function renderForm(overrides: Partial<Parameters<typeof MemberEditForm>[0]> = {}): {
  onSave: ReturnType<typeof vi.fn>;
  onInstrumentsChanged: ReturnType<typeof vi.fn>;
  rerenderWith: (next: Partial<Parameters<typeof MemberEditForm>[0]>) => void;
} {
  const onSave = vi.fn();
  const onInstrumentsChanged = vi.fn();
  const assignedInstrumentIds: readonly string[] = [];
  const props = {
    mode: 'create' as const,
    initialValues: BLANK_VALUES,
    instruments: INSTRUMENTS,
    assignedInstrumentIds,
    onSave,
    onCancel: vi.fn(),
    onInstrumentsChanged,
    ...overrides,
  };
  const view = render(<MemberEditForm key="new-member" {...props} />);
  const rerenderWith = (next: Partial<Parameters<typeof MemberEditForm>[0]>): void => {
    const merged = { ...props, ...next };
    view.rerender(<MemberEditForm key={merged.initialValues.firstName} {...merged} />);
  };
  return { onSave, onInstrumentsChanged, rerenderWith };
}

function readInputByLabel(label: RegExp | string): HTMLInputElement {
  const field = screen.getByLabelText(label);
  if (!(field instanceof HTMLInputElement)) throw new TypeError(`${String(label)} is not an input`);
  return field;
}

function readFirstNameField(): HTMLInputElement {
  return readInputByLabel(/first name/i);
}

// @FollowsBlueprint test-component-render
describe('MemberEditForm', () => {
  afterEach(() => {
    cleanup();
  });

  it('starts blank in create mode and hides the instrument panel', () => {
    renderForm();
    expect(readFirstNameField().value).toBe('');
    expect(screen.queryByLabelText('Bass')).toBeNull();
  });

  it('starts from the selected member and shows the instrument panel in edit mode', () => {
    renderForm({
      mode: 'edit',
      initialValues: { firstName: 'Ada', color: '#112233' },
      assignedInstrumentIds: ['bass-id'],
    });
    expect(readFirstNameField().value).toBe('Ada');
    expect(readInputByLabel('Bass').checked).toBe(true);
  });

  it('hands the typed values to onSave', async () => {
    const user = userEvent.setup();
    const { onSave } = renderForm();
    await user.type(readFirstNameField(), 'Ada');
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith({ firstName: 'Ada', color: DEFAULT_MEMBER_COLOR });
  });

  it('reports the toggled instrument set instead of mutating it', async () => {
    const user = userEvent.setup();
    const { onInstrumentsChanged } = renderForm({
      mode: 'edit',
      initialValues: { firstName: 'Ada', color: '#112233' },
      assignedInstrumentIds: ['bass-id'],
    });
    await user.click(screen.getByLabelText('Keys'));
    expect(onInstrumentsChanged).toHaveBeenCalledWith(['bass-id', 'keys-id']);
  });

  it('shows the new member once the page remounts it under a new key', () => {
    const { rerenderWith } = renderForm();
    rerenderWith({ mode: 'edit', initialValues: { firstName: 'Bob', color: '#445566' } });
    expect(readFirstNameField().value).toBe('Bob');
  });
});
