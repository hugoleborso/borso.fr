import { useTranslation } from 'react-i18next';
import { formatKilobytes } from '../../lib/formatters.utils';
import { ErrorText } from '../atoms/ErrorText';
import { FileInput } from '../atoms/FileInput';
import { Label } from '../atoms/Label';
import { Show } from '../atoms/Show';

const HINT_STYLE = { fontSize: 11 } as const;

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
    <div className="field">
      <Label htmlFor={id}>{label}</Label>
      <FileInput id={id} onFileChange={onFileChange} required={required} />
      <Show when={file !== null}>
        <div className="muted mono" style={HINT_STYLE}>
          {t('admin.setup.gpx-file-summary', {
            name: file?.name ?? '',
            kilobytes: formatKilobytes(file?.size ?? 0),
          })}
        </div>
      </Show>
      <Show when={errorKey !== null}>
        <ErrorText>{t(errorKey ?? 'admin.setup.gpx-unreadable')}</ErrorText>
      </Show>
    </div>
  );
}
