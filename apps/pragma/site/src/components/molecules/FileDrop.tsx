/**
 * FileDrop — drop-zone + file-picker fallback for chord-chart uploads.
 * Calls `/api/uploads/sign`, PUTs the file to the returned URL, then
 * emits `{ kind, objectKey }` to the parent so the song form can stamp
 * the chart variant. Validation lives in `file-drop.utils.ts`.
 *
 * The drag-state effect-free pattern: dragenter/dragleave drive a
 * `useState` flag — event-handler-driven, no `useEffect`.
 */

import { type DragEvent, type JSX, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api';
import { useSignChartUpload } from '../../lib/queries/uploads';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import {
  FILE_DROP_ACCEPT_ATTRIBUTE,
  FILE_DROP_MAX_MEBIBYTES,
  type FileDropChartKind,
  selectRejectionMessageKey,
  validateChartFile,
} from './file-drop.utils';

export interface FileDropResult {
  readonly kind: FileDropChartKind;
  readonly objectKey: string;
}

export interface FileDropProps {
  readonly songId?: string;
  readonly currentObjectKey?: string;
  readonly onUploaded: (result: FileDropResult) => void;
  readonly onRemoved?: () => void;
  readonly className?: string;
}

export function FileDrop({
  songId,
  currentObjectKey,
  onUploaded,
  onRemoved,
  className,
}: FileDropProps): JSX.Element {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const sign = useSignChartUpload();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBusy = sign.isPending;

  const uploadChartFile = async (file: File): Promise<void> => {
    setError(null);
    const validated = validateChartFile(file);
    if (!validated.ok) {
      setError(t(selectRejectionMessageKey(validated.reason), { maxMb: FILE_DROP_MAX_MEBIBYTES }));
      return;
    }
    try {
      const signed = await sign.mutateAsync({
        contentType: validated.contentType,
        contentLength: file.size,
        ...(songId === undefined ? {} : { songId }),
      });
      const putResponse = await fetch(signed.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!putResponse.ok) {
        setError(t('catalog.uploadFailed'));
        return;
      }
      onUploaded({ kind: validated.kind, objectKey: signed.objectKey });
    } catch (error_) {
      setError(error_ instanceof ApiError ? error_.message : t('catalog.uploadFailed'));
    }
  };

  const onDragOver = (event: DragEvent<HTMLLabelElement>): void => {
    event.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = (): void => setDragOver(false);

  const onDrop = (event: DragEvent<HTMLLabelElement>): void => {
    event.preventDefault();
    setDragOver(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped !== undefined) void uploadChartFile(dropped);
  };

  return (
    <div className={composeClassName('flex flex-col gap-2', className)}>
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
          ref={inputRef}
          id="file-drop-input"
          type="file"
          accept={FILE_DROP_ACCEPT_ATTRIBUTE}
          className="hidden"
          onChange={(event) => {
            const picked = event.target.files?.[0];
            if (picked !== undefined) void uploadChartFile(picked);
          }}
        />
      </label>
      {currentObjectKey !== undefined && currentObjectKey.length > 0 ? (
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <span className="truncate">
            {t('catalog.uploadCurrent')}: <span className="font-mono">{currentObjectKey}</span>
          </span>
          {onRemoved === undefined ? null : (
            <button
              type="button"
              onClick={() => {
                setError(null);
                onRemoved();
              }}
              className="text-ink-500 hover:text-accent text-sm underline-offset-2 hover:underline"
            >
              {t('fileDrop.remove')}
            </button>
          )}
        </div>
      ) : null}
      {error === null ? null : (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
