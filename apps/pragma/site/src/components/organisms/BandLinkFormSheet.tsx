/** @Feature band */

import { BAND_LINK_LABEL_MAX_LENGTH, BAND_LINK_URL_MAX_LENGTH } from '@domain/input-limits.core';
import { useForm } from '@tanstack/react-form';
import type { ParseKeys } from 'i18next';
import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Sheet } from '../molecules/Sheet';
import {
  BAND_LINK_FORM_REFUSAL_KEY,
  type BandLinkFormValues,
  EMPTY_BAND_LINK_FORM,
  selectBandLinkFormRefusal,
  trimBandLinkFields,
} from './band-link-form.core';

export interface BandLinkFormSheetProps {
  readonly onSave: (values: BandLinkFormValues) => Promise<void>;
  readonly onClose: () => void;
}

const LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';
const SAVE_FAILED_KEY: ParseKeys = 'bandLinks.saveFailed';

// @FollowsBlueprint organism-form-sharing-the-domain-rule
export function BandLinkFormSheet({ onSave, onClose }: BandLinkFormSheetProps): JSX.Element {
  const { t } = useTranslation();
  const [messageKey, setMessageKey] = useState<ParseKeys | null>(null);
  const form = useForm({
    defaultValues: EMPTY_BAND_LINK_FORM,
    onSubmit: async ({ value }) => {
      const refusal = selectBandLinkFormRefusal(value);
      setMessageKey(refusal === null ? null : BAND_LINK_FORM_REFUSAL_KEY[refusal]);
      if (refusal !== null) return;
      try {
        await onSave(trimBandLinkFields(value));
      } catch {
        setMessageKey(SAVE_FAILED_KEY);
      }
    },
  });
  const title = t('bandLinks.add');

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
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button icon="check" type="submit" variant="primary" size="lg" disabled={isSubmitting}>
              {t('common.add')}
            </Button>
          )}
        </form.Subscribe>
      }
    >
      <div className="flex flex-col gap-2.5">
        <label className={LABEL_CLASS} htmlFor="band-link-label">
          {t('bandLinks.label')}
        </label>
        <form.Field name="label">
          {(field) => (
            <Input
              id="band-link-label"
              data-sheet-focus
              type="text"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              maxLength={BAND_LINK_LABEL_MAX_LENGTH}
            />
          )}
        </form.Field>
        <label className={LABEL_CLASS} htmlFor="band-link-url">
          {t('bandLinks.url')}
        </label>
        <form.Field name="url">
          {(field) => (
            <Input
              id="band-link-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              maxLength={BAND_LINK_URL_MAX_LENGTH}
            />
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
