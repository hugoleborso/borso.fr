/** @Feature uploads */

import { ALLOWED_UPLOAD_CONTENT_TYPES } from '@domain/chart-upload.core';
import type { JSX } from 'react';
import {
  Button,
  DropZone,
  type DropZoneProps,
  FileTrigger,
  isFileDropItem,
} from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { FILE_DROP_MAX_MEBIBYTES } from './file-drop.utils';

type DropEvent = Parameters<NonNullable<DropZoneProps['onDrop']>>[0];
const ACCEPTED_FILE_TYPES = [...ALLOWED_UPLOAD_CONTENT_TYPES];

export interface FileDropZoneProps {
  readonly isBusy: boolean;
  readonly onFileChosen: (file: File) => void;
}

/**
 * @Blueprint molecule-local-state
 * @BlueprintName Molecule With Local State
 * @BlueprintUsage Use for a molecule that needs a small interface flag of its own, such as a drag highlight or an open toggle.
 * @BlueprintDescription Owns no drag flag of its own: React Aria's drop zone reports whether a file is held over it, so the highlight follows the pointer directly with no effect watching another piece of state. What the molecule cannot decide by itself, which is whether an upload is running and what the chosen file becomes, arrives as a prop or leaves through a callback, so the molecule renders without a query client and every rule about the file stays in the covered sibling `file-drop.utils.ts`.
 */
export function FileDropZone({ isBusy, onFileChosen }: FileDropZoneProps): JSX.Element {
  const { t } = useTranslation();

  const takeDroppedFile = async (event: DropEvent): Promise<void> => {
    const dropped = event.items.find(isFileDropItem);
    if (dropped !== undefined) onFileChosen(await dropped.getFile());
  };

  return (
    <DropZone
      onDrop={(event) => void takeDroppedFile(event)}
      className={({ isDropTarget }) =>
        composeClassName(
          'rounded-md border-2 border-dashed transition-colors',
          isDropTarget
            ? 'border-accent bg-accent/5'
            : 'border-rule text-ink-soft hover:border-ink hover:text-ink',
        )
      }
    >
      <FileTrigger
        acceptedFileTypes={ACCEPTED_FILE_TYPES}
        onSelect={(files) => {
          const picked = files?.[0];
          if (picked !== undefined) onFileChosen(picked);
        }}
      >
        <Button className="flex w-full flex-col items-center justify-center gap-2 border-0 bg-transparent px-6 py-8 text-start cursor-pointer outline-none data-focus-visible:outline-3 data-focus-visible:outline-focus">
          <Icon name="upload" size="md" />
          <span className="text-meta font-medium">
            {isBusy ? t('catalog.uploadInProgress') : t('catalog.uploadPrompt')}
          </span>
          <span className="text-meta text-ink-soft">
            {t('catalog.uploadHint', { maxMb: FILE_DROP_MAX_MEBIBYTES })}
          </span>
        </Button>
      </FileTrigger>
    </DropZone>
  );
}
