/** @Feature sketches */

import { SKETCH_LANE_NAME_MAX_LENGTH } from '@domain/input-limits.core';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Sheet } from '../molecules/Sheet';

export interface SketchLaneSheetProps {
  readonly isNew: boolean;
  readonly initialName: string;
  readonly onSave: (name: string) => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
}

const FIELD_CLASS = 'flex flex-col gap-1 text-meta text-ink-soft';

// @FollowsBlueprint route-form
export function SketchLaneSheet({
  isNew,
  initialName,
  onSave,
  onDelete,
  onClose,
}: SketchLaneSheetProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { name: initialName },
    onSubmit: ({ value }) => {
      const name = value.name.trim();
      if (name.length === 0) return;
      onSave(name);
    },
  });
  const sheetTitle = isNew ? t('sketch.newLane') : t('sketch.lane');

  return (
    <Sheet
      title={sheetTitle}
      label={sheetTitle}
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          {isNew ? (
            <span />
          ) : (
            <Button icon="trash" variant="quiet" size="md" onClick={onDelete}>
              {t('sketch.deleteLane')}
            </Button>
          )}
          <Button icon="check" type="submit" variant="primary" size="lg">
            {isNew ? t('common.add') : t('common.save')}
          </Button>
        </div>
      }
    >
      <form.Field name="name">
        {(field) => (
          <label className={FIELD_CLASS}>
            {t('sketch.laneName')}
            <Input
              data-sheet-focus
              value={field.state.value}
              maxLength={SKETCH_LANE_NAME_MAX_LENGTH}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </label>
        )}
      </form.Field>
    </Sheet>
  );
}
