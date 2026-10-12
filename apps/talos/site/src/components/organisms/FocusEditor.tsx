import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import {
  buildFocusPayload,
  canAddFocusItem,
  EMPTY_FOCUS_ITEM,
  type FocusItemShape,
  focusFormSchema,
  toFocusFormValues,
} from './focus-editor.core';

export interface FocusEditorProps {
  readonly items: readonly FocusItemShape[];
  readonly onSave: (items: FocusItemShape[]) => void;
  readonly onCancel: () => void;
}

// @FollowsBlueprint organism-form
export function FocusEditor({ items, onSave, onCancel }: FocusEditorProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: toFocusFormValues(items),
    validators: { onChange: focusFormSchema },
    onSubmit: ({ value }) => {
      onSave(buildFocusPayload(value).items);
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="items" mode="array">
        {(itemsField) => {
          const canAddItem = canAddFocusItem(itemsField.state.value.length);
          return (
            <>
              {itemsField.state.value.map((_draft, index) => (
                <fieldset
                  key={index}
                  className="m-0 p-3 flex flex-col gap-2 rounded-md border border-line bg-bg"
                >
                  <div className="flex items-center gap-2">
                    <form.Field name={`items[${index}].title`}>
                      {(field) => (
                        <Input
                          aria-label={t('today.focus.item-title')}
                          placeholder={t('today.focus.item-title')}
                          value={field.state.value}
                          onChange={(event) => field.handleChange(event.target.value)}
                          className="font-medium"
                        />
                      )}
                    </form.Field>
                    <Button
                      variant="quiet"
                      size="icon"
                      aria-label={t('today.focus.remove')}
                      onClick={() => itemsField.removeValue(index)}
                    >
                      <Icon name="close" size={18} />
                    </Button>
                  </div>
                  <form.Field name={`items[${index}].why`}>
                    {(field) => (
                      <Input
                        aria-label={t('today.focus.why')}
                        placeholder={t('today.focus.why')}
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                  <form.Field name={`items[${index}].horizon`}>
                    {(field) => (
                      <label className="flex items-center gap-2 text-sm text-ink-muted">
                        <span className="w-20 shrink-0">{t('today.focus.horizon')}</span>
                        <Input
                          type="date"
                          value={field.state.value}
                          onChange={(event) => field.handleChange(event.target.value)}
                        />
                      </label>
                    )}
                  </form.Field>
                </fieldset>
              ))}
              {canAddItem ? (
                <Button
                  variant="quiet"
                  className="self-start"
                  onClick={() => itemsField.pushValue({ ...EMPTY_FOCUS_ITEM })}
                >
                  <Icon name="plus" size={18} />
                  {t('today.focus.add')}
                </Button>
              ) : (
                <p className="m-0 text-sm text-ink-faint">{t('today.focus.limit')}</p>
              )}
            </>
          );
        }}
      </form.Field>
      <div className="flex gap-2 justify-end">
        <Button variant="quiet" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="primary">
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
