import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField } from '../molecules/FormField';
import { type GpxErrorKey, GpxFileField } from '../molecules/GpxFileField';

const HINT_STYLE = { fontSize: 11 } as const;
const ROW_STYLE = { gap: 'var(--d-3)' } as const;
const WIDE_FIELD_STYLE = { flex: 1 } as const;
const INTERVAL_FIELD_STYLE = { flex: '0 0 140px' } as const;

const MINIMUM_SLUG_LENGTH = 3;
const MINIMUM_INTERVAL_MINUTES = 1;
const MAXIMUM_INTERVAL_MINUTES = 240;
const INTERVAL_STEP_MINUTES = 1;

export interface EditionFieldBinding {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onBlur: () => void;
}

interface EditionFormFieldsProps {
  /** Prefix for the field element identifiers, e.g. `create` or `setup`. */
  readonly idPrefix: string;
  readonly slug: EditionFieldBinding;
  readonly displayName: EditionFieldBinding;
  readonly startsAt: EditionFieldBinding;
  readonly endsAt: EditionFieldBinding;
  readonly intervalMinutes: EditionFieldBinding;
  readonly isSlugLocked: boolean;
  readonly gpxLabel: string;
  readonly gpxFile: File | null;
  readonly onGpxFileChange: (file: File | null) => void;
  readonly isGpxRequired: boolean;
  readonly gpxErrorKey: GpxErrorKey | null;
  /** Extra note above the GPX picker, e.g. the track already on file. */
  readonly gpxNote?: ReactNode;
}

/**
 * The fields shared by the create form and the edit form. Both forms own
 * their own `useForm` instance and pass its bindings in, so their field state
 * never bleeds across.
 */
export function EditionFormFields({
  idPrefix,
  slug,
  displayName,
  startsAt,
  endsAt,
  intervalMinutes,
  isSlugLocked,
  gpxLabel,
  gpxFile,
  onGpxFileChange,
  isGpxRequired,
  gpxErrorKey,
  gpxNote,
}: EditionFormFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <FormField
        id={`${idPrefix}-slug`}
        label={t('admin.setup.slug')}
        value={slug.value}
        onValueChange={slug.onValueChange}
        onBlur={slug.onBlur}
        required
        minimumLength={MINIMUM_SLUG_LENGTH}
        readOnly={isSlugLocked}
        disabled={isSlugLocked}
      />
      <FormField
        id={`${idPrefix}-name`}
        label={t('admin.setup.name')}
        value={displayName.value}
        onValueChange={displayName.onValueChange}
        onBlur={displayName.onBlur}
        required
      />
      <div className="row" style={ROW_STYLE}>
        <FormField
          id={`${idPrefix}-start`}
          label={t('admin.setup.starts-at')}
          type="datetime-local"
          value={startsAt.value}
          onValueChange={startsAt.onValueChange}
          onBlur={startsAt.onBlur}
          required
          style={WIDE_FIELD_STYLE}
        />
        <FormField
          id={`${idPrefix}-end`}
          label={t('admin.setup.ends-at')}
          type="datetime-local"
          value={endsAt.value}
          onValueChange={endsAt.onValueChange}
          onBlur={endsAt.onBlur}
          required
          style={WIDE_FIELD_STYLE}
        />
        <FormField
          id={`${idPrefix}-interval`}
          label={t('admin.setup.interval')}
          type="number"
          value={intervalMinutes.value}
          onValueChange={intervalMinutes.onValueChange}
          onBlur={intervalMinutes.onBlur}
          required
          minimum={MINIMUM_INTERVAL_MINUTES}
          maximum={MAXIMUM_INTERVAL_MINUTES}
          step={INTERVAL_STEP_MINUTES}
          style={INTERVAL_FIELD_STYLE}
        />
      </div>
      {gpxNote}
      <GpxFileField
        id={`${idPrefix}-gpx`}
        label={gpxLabel}
        file={gpxFile}
        onFileChange={onGpxFileChange}
        required={isGpxRequired}
        errorKey={gpxErrorKey}
      />
      <div className="muted mono" style={HINT_STYLE}>
        {t('admin.setup.sun-hint')}
      </div>
    </>
  );
}
