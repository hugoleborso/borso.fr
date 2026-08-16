/**
 * FileDropZone — the drag target and file-picker fallback a chord-chart
 * upload is started from. It hands the chosen file to its parent, which
 * owns the upload and the message the operator reads afterwards.
 * @Feature uploads
 */

import { type DragEvent, type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { FILE_DROP_ACCEPT_ATTRIBUTE, FILE_DROP_MAX_MEBIBYTES } from './file-drop.utils';

export interface FileDropZoneProps {
  readonly isBusy: boolean;
  readonly onFileChosen: (file: File) => void;
}

/**
 * @Blueprint molecule-local-state
 * @BlueprintName Molecule With Local State
 * @BlueprintUsage Use for a molecule that needs a small interface flag of its own, such as a drag highlight or an open toggle.
 * @BlueprintDescription Owns one `useState` flag written only from the drag handlers, never from an effect watching another piece of state, so the highlight follows the pointer directly. What the molecule cannot decide by itself, which is whether an upload is running and what the chosen file becomes, arrives as a prop or leaves through a callback, so the molecule renders without a query client and every rule about the file stays in the covered sibling `file-drop.utils.ts`.
 */
export function FileDropZone({ isBusy, onFileChosen }: FileDropZoneProps): JSX.Element {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = useState(false);

  const onDragOver = (event: DragEvent<HTMLLabelElement>): void => {
    event.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = (): void => setDragOver(false);

  const onDrop = (event: DragEvent<HTMLLabelElement>): void => {
    event.preventDefault();
    setDragOver(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped !== undefined) onFileChosen(dropped);
  };

  return (
    <label
      htmlFor="file-drop-input"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={composeClassName(
        'flex flex-col items-center justify-center gap-2 px-6 py-8 rounded-md border-2 border-dashed cursor-pointer transition-colors',
        dragOver
          ? 'border-accent bg-accent/5'
          : 'border-line text-ink-500 hover:border-ink-700 hover:text-ink-700',
      )}
    >
      <Icon name="upload" size={20} />
      <span className="text-sm font-medium">
        {isBusy ? t('catalog.uploadInProgress') : t('catalog.uploadPrompt')}
      </span>
      <span className="text-xs text-ink-400">
        {t('catalog.uploadHint', { maxMb: FILE_DROP_MAX_MEBIBYTES })}
      </span>
      <input
        id="file-drop-input"
        type="file"
        accept={FILE_DROP_ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={(event) => {
          const picked = event.target.files?.[0];
          if (picked !== undefined) onFileChosen(picked);
        }}
      />
    </label>
  );
}
