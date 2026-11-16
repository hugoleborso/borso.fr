/** @Feature songs */

import { CHART_IMAGE_CONTENT_TYPES, CHART_PDF_CONTENT_TYPE } from '@domain/chart-upload.core';
import { CHORDPRO_TEXT_MAX_LENGTH, SONG_CHART_LABEL_MAX_LENGTH } from '@domain/input-limits.core';
import { type ChangeEvent, type JSX, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readTextFromClipboard } from '../../lib/clipboard.adapter';
import { readPdfTextItems } from '../../lib/pdf-text.adapter';
import { recordProductEvent } from '../../observability/product-event.adapter';
import { hasChosenChart } from '../../routes/catalog/chart-kind.utils';
import { describeChordChartAdded } from '../../routes/catalog/chords-above-lyrics.core';
import { layOutPdfText } from '../../routes/catalog/pdf-text-layout.core';
import {
  canMoveChartCard,
  type SongChartCardDraft,
} from '../../routes/catalog/song-chart-cards.core';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { Button } from '../atoms/Button';
import { composeClassName } from '../atoms/class-name.utils';
import { IconButton } from '../atoms/IconButton';
import { Input } from '../atoms/Input';
import { FIELD_LABEL_CLASS } from '../atoms/LabelledField';
import {
  type InstrumentToggleOption,
  InstrumentToggleGroup,
} from '../molecules/InstrumentToggleGroup';
import { useChartUpload } from './chart-upload.hook';
import { FileDrop } from './FileDrop';
import { SongChordPreview } from './SongChordPreview';

export interface SongChartCardProps {
  readonly card: SongChartCardDraft;
  readonly index: number;
  readonly cardCount: number;
  readonly instruments: readonly InstrumentToggleOption[];
  readonly songId?: string;
  readonly onChange: (changes: Partial<SongChartCardDraft>) => void;
  readonly onChordproChange: (text: string) => void;
  readonly onMove: (offset: number) => void;
  readonly onRemove: () => void;
}

const CHORD_TEXT_ID_PREFIX = 'song-chord-text';
const CHART_LABEL_ID_PREFIX = 'song-chart-label';
const CHORD_TEXT_ROWS = 6;
const IMAGE_ACCEPT = CHART_IMAGE_CONTENT_TYPES.join(',');
const MOVE_UP = -1;
const MOVE_DOWN = 1;

function readChosenFile(event: ChangeEvent<HTMLInputElement>): File | null {
  return event.target.files?.[0] ?? null;
}

// @FollowsBlueprint organism-query-owning
export function SongChartCard(props: SongChartCardProps): JSX.Element {
  const { t } = useTranslation();
  const chartUpload = useChartUpload(props.songId);
  const photoInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const isBusy = isReadingPdf || chartUpload.isBusy;
  const isChartChosen = hasChosenChart(props.card.kind);
  const canMoveUp = canMoveChartCard(props.index, props.cardCount, MOVE_UP);
  const canMoveDown = canMoveChartCard(props.index, props.cardCount, MOVE_DOWN);
  const labelId = `${CHART_LABEL_ID_PREFIX}-${String(props.index)}`;

  const showText = (text: string): void => {
    chartUpload.clearError();
    props.onChange({ kind: 'chordpro' });
    props.onChordproChange(text);
  };

  const pasteText = async (): Promise<void> => {
    const clipboardText = await readTextFromClipboard();
    if (clipboardText !== null) {
      recordProductEvent('chord_chart_added', {
        ...describeChordChartAdded('paste', clipboardText),
      });
    }
    showText(clipboardText ?? props.card.chordproText);
  };

  const storePhoto = async (file: File): Promise<void> => {
    const uploaded = await chartUpload.upload(file);
    if (uploaded === null) return;
    recordProductEvent('chord_chart_added', { ...describeChordChartAdded('photo', null) });
    props.onChange({ kind: 'image', imageS3Key: uploaded.objectKey });
  };

  const storePdf = async (file: File): Promise<void> => {
    setIsReadingPdf(true);
    const text = await readPdfTextItems(file)
      .then(layOutPdfText)
      .catch(() => '');
    setIsReadingPdf(false);
    if (text.length > 0) {
      recordProductEvent('chord_chart_added', { ...describeChordChartAdded('pdf', text) });
      showText(text);
      return;
    }
    const uploaded = await chartUpload.upload(file);
    if (uploaded === null) return;
    recordProductEvent('chord_chart_added', { ...describeChordChartAdded('pdf', null) });
    props.onChange({ kind: 'pdf', pdfS3Key: uploaded.objectKey });
  };

  return (
    <section
      className="flex flex-col gap-3 rounded-md bg-sunk p-3"
      aria-label={t('catalog.chordChartNumbered', { number: props.index + 1 })}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className={composeClassName(FIELD_LABEL_CLASS, 'm-0')}>
          {t('catalog.chordChartNumbered', { number: props.index + 1 })}
        </h3>
        <div className="flex items-center gap-1">
          <IconButton
            icon="chevU"
            label={t('catalog.chartMoveUp')}
            disabled={!canMoveUp}
            onClick={() => props.onMove(MOVE_UP)}
          />
          <IconButton
            icon="chevD"
            label={t('catalog.chartMoveDown')}
            disabled={!canMoveDown}
            onClick={() => props.onMove(MOVE_DOWN)}
          />
          <IconButton icon="trash" label={t('catalog.chordsRemove')} onClick={props.onRemove} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={FIELD_LABEL_CLASS}>{t('catalog.chartInstruments')}</span>
        <InstrumentToggleGroup
          label={t('catalog.chartInstruments')}
          instruments={props.instruments}
          selectedIds={props.card.instrumentIds}
          onChange={(instrumentIds) => props.onChange({ instrumentIds })}
        />
        <p className="m-0 text-meta text-ink-soft">{t('catalog.chartInstrumentsHint')}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={FIELD_LABEL_CLASS} htmlFor={labelId}>
          {t('catalog.chartLabel')}
        </label>
        <Input
          id={labelId}
          type="text"
          value={props.card.label}
          placeholder={t('catalog.chartLabelPlaceholder')}
          maxLength={SONG_CHART_LABEL_MAX_LENGTH}
          onChange={(event) => props.onChange({ label: event.target.value })}
        />
      </div>
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
      {isChartChosen ? <SongChartEditor {...props} /> : null}
    </section>
  );
}

function SongChartEditor(props: SongChartCardProps): JSX.Element | null {
  const { t } = useTranslation();
  const chordTextId = `${CHORD_TEXT_ID_PREFIX}-${String(props.index)}`;
  if (props.card.kind === 'chordpro') {
    return (
      <div className="flex flex-col gap-2">
        <label className={FIELD_LABEL_CLASS} htmlFor={chordTextId}>
          {t('catalog.chordsTextLabel')}
        </label>
        <AutoGrowTextarea
          id={chordTextId}
          value={props.card.chordproText}
          onChange={(event) => props.onChordproChange(event.target.value)}
          placeholder={t('catalog.chordsTextPlaceholder')}
          className="font-mono"
          rows={CHORD_TEXT_ROWS}
          maxLength={CHORDPRO_TEXT_MAX_LENGTH}
        />
        <SongChordPreview chordText={props.card.chordproText} />
      </div>
    );
  }
  if (props.card.kind === 'pdf') {
    return (
      <FileDrop
        songId={props.songId}
        currentObjectKey={props.card.pdfS3Key}
        onUploaded={(result) => props.onChange({ pdfS3Key: result.objectKey })}
        onRemoved={() => props.onChange({ pdfS3Key: '' })}
      />
    );
  }
  return (
    <FileDrop
      songId={props.songId}
      currentObjectKey={props.card.imageS3Key}
      onUploaded={(result) => props.onChange({ imageS3Key: result.objectKey })}
      onRemoved={() => props.onChange({ imageS3Key: '' })}
    />
  );
}
