import { useTranslation } from 'react-i18next';
import { formatKilobytes } from '../../lib/formatters.utils';
import { ErrorText } from '../atoms/ErrorText';
import { FileInput } from '../atoms/FileInput';
import { Label } from '../atoms/Label';
import { MonoNote } from '../atoms/MonoNote';
import { Show } from '../atoms/Show';

/** The three ways reading a picked GPX file can fail. */
export type GpxErrorKey =
  'admin.setup.gpx-missing' | 'admin.setup.gpx-empty' | 'admin.setup.gpx-unreadable';

interface GpxFileFieldProps {
  readonly id: string;
  readonly label: string;
  readonly file: File | null;
  readonly onFileChange: (file: File | null) => void;
  readonly required: boolean;
  readonly errorKey: GpxErrorKey | null;
}

/**
 * File picker for a GPX track, with the picked file's name and size under it.
 *
 * There is no `accept` attribute on purpose: iOS Files filters by uniform type
 * identifier and has no entry for `.gpx`, so any value greys every file out in
 * the picker. The API rejects a body that is not GPX with a 400 anyway.
 */
/**
 * @Blueprint molecule-field
 * @BlueprintName Molecule Form Field
 * @BlueprintUsage Use for one labelled form control with its hint and its error message.
 * @BlueprintDescription Composes the `Label`, `FileInput` and `ErrorText` atoms into one field, and owns no state: the picked file, whether it is required, and which error to show all arrive as props, so the form that owns the field state decides everything. The hint and the error are gated by `Show` rather than a ternary, and the error is a translation key union rather than a message, so the field never holds a user facing string.
 */
export function GpxFileField({
  id,
  label,
  file,
  onFileChange,
  required,
  errorKey,
}: GpxFileFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <FileInput id={id} onFileChange={onFileChange} required={required} />
      <Show when={file !== null}>
        <MonoNote>
          {t('admin.setup.gpx-file-summary', {
            name: file?.name ?? '',
            kilobytes: formatKilobytes(file?.size ?? 0),
          })}
        </MonoNote>
      </Show>
      <Show when={errorKey !== null}>
        <ErrorText>{t(errorKey ?? 'admin.setup.gpx-unreadable')}</ErrorText>
      </Show>
    </div>
  );
}
