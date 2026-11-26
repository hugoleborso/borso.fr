/** @Feature sessions */

import { DEFAULT_GEAR_STATUS, type GearHolding } from '@domain/gear-status.core';
import { GEAR_ITEM_LABEL_MAX_LENGTH } from '@domain/input-limits.core';
import { useForm } from '@tanstack/react-form';
import type { ParseKeys } from 'i18next';
import { type JSX, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RadioButton, RadioField, RadioGroup } from 'react-aria-components';
import {
  type GearLabelRefusal,
  gearHoldingChoiceKey,
  readGearHoldingChoice,
  selectGearLabelRefusal,
} from '../../routes/sessions/gear-page.core';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { MemberChip } from '../molecules/MemberChip';
import { Sheet } from '../molecules/Sheet';

export interface GearItemSheetMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export interface GearItemDraft {
  readonly label: string;
  readonly holding: GearHolding;
}

export interface GearItemSheetProps {
  readonly members: readonly GearItemSheetMember[];
  readonly initial: GearItemDraft | null;
  readonly onSave: (draft: GearItemDraft) => Promise<void>;
  readonly onDelete: (() => Promise<void>) | null;
  readonly onClose: () => void;
}

const LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';
const SAVE_FAILED_KEY: ParseKeys = 'gear.saveFailed';
const REFUSAL_KEY: Readonly<Record<GearLabelRefusal, ParseKeys>> = {
  empty: 'gear.refusal.empty',
  'too-long': 'gear.refusal.tooLong',
};
const EMPTY_DRAFT: GearItemDraft = {
  label: '',
  holding: { status: DEFAULT_GEAR_STATUS, memberId: null },
};
const RADIO_CLASS =
  'flex size-11 cursor-pointer items-center justify-center rounded-pill border-2 border-transparent text-ink-soft ' +
  'data-selected:border-ink data-focus-visible:outline-3 data-focus-visible:outline-focus';

function HolderRadio({
  value,
  label,
  children,
}: {
  readonly value: string;
  readonly label: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <RadioField value={value} aria-label={label}>
      <RadioButton className={RADIO_CLASS}>{children}</RadioButton>
    </RadioField>
  );
}

// @FollowsBlueprint organism-form-sharing-the-domain-rule
export function GearItemSheet({
  members,
  initial,
  onSave,
  onDelete,
  onClose,
}: GearItemSheetProps): JSX.Element {
  const { t } = useTranslation();
  const [messageKey, setMessageKey] = useState<ParseKeys | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const draft = initial ?? EMPTY_DRAFT;
  const form = useForm({
    defaultValues: { label: draft.label, holderChoice: gearHoldingChoiceKey(draft.holding) },
    onSubmit: async ({ value }) => {
      const refusal = selectGearLabelRefusal(value.label);
      setMessageKey(refusal === null ? null : REFUSAL_KEY[refusal]);
      if (refusal !== null) return;
      try {
        await onSave({
          label: value.label.trim(),
          holding: readGearHoldingChoice(value.holderChoice),
        });
      } catch {
        setMessageKey(SAVE_FAILED_KEY);
      }
    },
  });
  const deleteItem = async (remove: () => Promise<void>): Promise<void> => {
    setIsDeleting(true);
    try {
      await remove();
    } catch {
      setMessageKey(SAVE_FAILED_KEY);
      setIsDeleting(false);
    }
  };
  const title = t(initial === null ? 'gear.add' : 'gear.editTitle');

  return (
    <Sheet
      title={title}
      label={title}
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      footer={
        <>
          {onDelete === null ? null : (
            <Button
              icon="trash"
              variant="secondary"
              size="lg"
              disabled={isDeleting}
              onClick={() => void deleteItem(onDelete)}
            >
              {t('common.delete')}
            </Button>
          )}
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                icon={initial === null ? 'plus' : 'check'}
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting || isDeleting}
              >
                {t(initial === null ? 'common.add' : 'common.save')}
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <div className="flex flex-col gap-2.5">
        <label className={LABEL_CLASS} htmlFor="gear-item-label">
          {t('gear.item')}
        </label>
        <form.Field name="label">
          {(field) => (
            <Input
              id="gear-item-label"
              data-sheet-focus
              type="text"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              maxLength={GEAR_ITEM_LABEL_MAX_LENGTH}
            />
          )}
        </form.Field>
        <form.Field name="holderChoice">
          {(field) => (
            <RadioGroup
              aria-label={t('gear.holderLegend')}
              value={field.state.value}
              onChange={field.handleChange}
              orientation="horizontal"
              className="m-0 mt-2 flex flex-wrap items-center gap-1.5"
            >
              <HolderRadio value="to_find" label={t('gear.status.to_find')}>
                <Icon name="pending" size="lg" />
              </HolderRadio>
              <HolderRadio value="asked_of_venue" label={t('gear.status.asked_of_venue')}>
                <Icon name="venue" size="lg" />
              </HolderRadio>
              <span aria-hidden="true" className="mx-0.5 h-7 w-px bg-rule" />
              {members.map((member) => (
                <HolderRadio
                  key={member.id}
                  value={member.id}
                  label={t('gear.memberHas', { name: member.firstName })}
                >
                  <MemberChip memberName={member.firstName} memberColor={member.color} size="md" />
                </HolderRadio>
              ))}
            </RadioGroup>
          )}
        </form.Field>
        {messageKey === null ? null : (
          <p className="m-0 text-meta text-danger" role="alert">
            {t(messageKey)}
          </p>
        )}
      </div>
    </Sheet>
  );
}
