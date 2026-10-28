/** @Feature songs */

import { CHART_IMAGE_CONTENT_TYPES, CHART_PDF_CONTENT_TYPE } from '@domain/chart-upload.core';
import { CHORDPRO_TEXT_MAX_LENGTH } from '@domain/input-limits.core';
import { type ChangeEvent, type JSX, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readTextFromClipboard } from '../../lib/clipboard.adapter';
import { readPdfTextItems } from '../../lib/pdf-text.adapter';
import { hasChosenChart } from '../../routes/catalog/chart-kind.utils';
import { layOutPdfText } from '../../routes/catalog/pdf-text-layout.core';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { composeClassName } from '../atoms/class-name.utils';
import { useChartUpload } from './chart-upload.hook';
import { FileDrop } from './FileDrop';
import { SongChordPreview } from './SongChordPreview';

export type SongChartKind = 'none' | 'chordpro' | 'pdf' | 'image';

interface SongChartFieldsProps {
  readonly chartKind: SongChartKind;
  readonly chordproText: string;
  readonly pdfS3Key: string;
  readonly imageS3Key: string;
  readonly tonalityStart: string;
  readonly tonalityEnd: string;
  readonly baseEnergy: string;
  readonly songId?: string;
  readonly onChartKindChange: (kind: SongChartKind) => void;
  readonly onChordproChange: (text: string) => void;
  readonly onPdfKeyChange: (key: string) => void;
  readonly onImageKeyChange: (key: string) => void;
  readonly onTonalityStartChange: (value: string) => void;
  readonly onTonalityEndChange: (value: string) => void;
  readonly onBaseEnergyChange: (value: string) => void;
}

const LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';
const CHORD_TEXT_ID = 'song-chord-text';
const CHORD_TEXT_ROWS = 6;
const IMAGE_ACCEPT = CHART_IMAGE_CONTENT_TYPES.join(',');

function readChosenFile(event: ChangeEvent<HTMLInputElement>): File | null {
  return event.target.files?.[0] ?? null;
}

// @FollowsBlueprint organism-query-owning
export function SongChartFields(props: SongChartFieldsProps): JSX.Element {
  const { t } = useTranslation();
  const chartUpload = useChartUpload(props.songId);
  const photoInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const isBusy = isReadingPdf || chartUpload.isBusy;
  const isChartChosen = hasChosenChart(props.chartKind);

  const showText = (text: string): void => {
    chartUpload.clearError();
    props.onChartKindChange('chordpro');
    props.onChordproChange(text);
  };

  const pasteText = async (): Promise<void> => {
    const clipboardText = await readTextFromClipboard();
    showText(clipboardText ?? props.chordproText);
  };

  const storePhoto = async (file: File): Promise<void> => {
    const uploaded = await chartUpload.upload(file);
    if (uploaded === null) return;
    props.onImageKeyChange(uploaded.objectKey);
    props.onChartKindChange('image');
  };

  const storePdf = async (file: File): Promise<void> => {
    setIsReadingPdf(true);
    const text = await readPdfTextItems(file)
      .then(layOutPdfText)
      .catch(() => '');
    setIsReadingPdf(false);
    if (text.length > 0) {
      showText(text);
      return;
    }
    const uploaded = await chartUpload.upload(file);
    if (uploaded === null) return;
    props.onPdfKeyChange(uploaded.objectKey);
    props.onChartKindChange('pdf');
  };

  return (
    <>
      <fieldset className="mt-2 flex flex-col gap-3 rounded-md border border-rule p-3">
        <legend className={composeClassName(LABEL_CLASS, 'px-2')}>{t('catalog.chordChart')}</legend>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon="clipboard"
            disabled={isBusy}
            onClick={() => void pasteText()}
          >
            {t('catalog.chordsPaste')}
          </Button>
          <Button
            variant="secondary"
            icon="camera"
            disabled={isBusy}
            onClick={() => photoInput.current?.click()}
          >
            {t('catalog.chordsPhoto')}
          </Button>
          <Button
            variant="secondary"
            icon="upload"
            disabled={isBusy}
            onClick={() => pdfInput.current?.click()}
          >
            {t('catalog.chordsPdf')}
          </Button>
          <input
            ref={photoInput}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            aria-label={t('catalog.chordsPhoto')}
            onChange={(event) => {
              const chosen = readChosenFile(event);
              if (chosen !== null) void storePhoto(chosen);
            }}
          />
          <input
            ref={pdfInput}
            type="file"
            accept={CHART_PDF_CONTENT_TYPE}
            className="hidden"
            aria-label={t('catalog.chordsPdf')}
            onChange={(event) => {
              const chosen = readChosenFile(event);
              if (chosen !== null) void storePdf(chosen);
            }}
          />
        </div>
        {isReadingPdf ? (
          <p className="m-0 text-meta text-ink-soft">{t('catalog.chordsReadingPdf')}</p>
        ) : null}
        {chartUpload.isBusy ? (
          <p className="m-0 text-meta text-ink-soft">{t('catalog.uploadInProgress')}</p>
        ) : null}
        {chartUpload.error === null ? null : (
          <p className="m-0 text-meta text-danger" role="alert">
            {chartUpload.error}
          </p>
        )}
        <SongChartEditor {...props} />
        {isChartChosen ? (
          <Button
            variant="quiet"
            size="sm"
            icon="trash"
            className="self-start"
            onClick={() => props.onChartKindChange('none')}
          >
            {t('catalog.chordsRemove')}
          </Button>
        ) : null}
      </fieldset>

      <label className={LABEL_CLASS} htmlFor="song-tonality-start">
        {t('catalog.tonalityStart')}
      </label>
      <Input
        id="song-tonality-start"
        type="text"
        value={props.tonalityStart}
        onChange={(event) => props.onTonalityStartChange(event.target.value)}
        maxLength={16}
      />

      <label className={LABEL_CLASS} htmlFor="song-tonality-end">
        {t('catalog.tonalityEnd')}
      </label>
      <Input
        id="song-tonality-end"
        type="text"
        value={props.tonalityEnd}
        onChange={(event) => props.onTonalityEndChange(event.target.value)}
        maxLength={16}
      />

      <label className={LABEL_CLASS} htmlFor="song-base-energy">
        {t('catalog.baseEnergy')}
      </label>
      <Input
        id="song-base-energy"
        type="number"
        min={1}
        max={10}
        value={props.baseEnergy}
        onChange={(event) => props.onBaseEnergyChange(event.target.value)}
      />
    </>
  );
}

function SongChartEditor(props: SongChartFieldsProps): JSX.Element | null {
  const { t } = useTranslation();
  if (props.chartKind === 'chordpro') {
    return (
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={CHORD_TEXT_ID}>
          {t('catalog.chordsTextLabel')}
        </label>
        <AutoGrowTextarea
          id={CHORD_TEXT_ID}
          value={props.chordproText}
          onChange={(event) => props.onChordproChange(event.target.value)}
          placeholder={t('catalog.chordsTextPlaceholder')}
          className="font-mono"
          rows={CHORD_TEXT_ROWS}
          maxLength={CHORDPRO_TEXT_MAX_LENGTH}
        />
        <SongChordPreview chordText={props.chordproText} />
      </div>
    );
  }
  if (props.chartKind === 'pdf') {
    return (
      <FileDrop
        songId={props.songId}
        currentObjectKey={props.pdfS3Key}
        onUploaded={(result) => props.onPdfKeyChange(result.objectKey)}
        onRemoved={() => props.onPdfKeyChange('')}
      />
    );
  }
  if (props.chartKind === 'image') {
    return (
      <FileDrop
        songId={props.songId}
        currentObjectKey={props.imageS3Key}
        onUploaded={(result) => props.onImageKeyChange(result.objectKey)}
        onRemoved={() => props.onImageKeyChange('')}
      />
    );
  }
  return null;
}
