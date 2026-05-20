/**
 * Chord chart variant + tonality + base-energy fields. Extracted from
 * SongDetailPage so the parent stays under the file-length limit.
 */

import { useTranslation } from 'react-i18next';

export type SongChartKind = 'none' | 'chordpro' | 'pdf' | 'image';

interface SongChartFieldsProps {
  readonly chartKind: SongChartKind;
  readonly chordproText: string;
  readonly pdfS3Key: string;
  readonly imageS3Key: string;
  readonly tonalityStart: string;
  readonly tonalityEnd: string;
  readonly baseEnergy: string;
  readonly onChartKindChange: (kind: SongChartKind) => void;
  readonly onChordproChange: (text: string) => void;
  readonly onPdfKeyChange: (key: string) => void;
  readonly onImageKeyChange: (key: string) => void;
  readonly onTonalityStartChange: (value: string) => void;
  readonly onTonalityEndChange: (value: string) => void;
  readonly onBaseEnergyChange: (value: string) => void;
}

export function SongChartFields(props: SongChartFieldsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <label className="admin-page-form-label" htmlFor="song-tonality-start">
        {t('catalog.tonalityStart')}
      </label>
      <input
        id="song-tonality-start"
        type="text"
        value={props.tonalityStart}
        onChange={(event) => props.onTonalityStartChange(event.target.value)}
        maxLength={16}
        className="admin-page-form-input"
      />

      <label className="admin-page-form-label" htmlFor="song-tonality-end">
        {t('catalog.tonalityEnd')}
      </label>
      <input
        id="song-tonality-end"
        type="text"
        value={props.tonalityEnd}
        onChange={(event) => props.onTonalityEndChange(event.target.value)}
        maxLength={16}
        className="admin-page-form-input"
      />

      <label className="admin-page-form-label" htmlFor="song-base-energy">
        {t('catalog.baseEnergy')}
      </label>
      <input
        id="song-base-energy"
        type="number"
        min={1}
        max={10}
        value={props.baseEnergy}
        onChange={(event) => props.onBaseEnergyChange(event.target.value)}
        className="admin-page-form-input"
      />

      <fieldset className="admin-page-form-fieldset">
        <legend>{t('catalog.chordChart')}</legend>
        <label className="admin-page-form-checkbox">
          <input
            type="radio"
            name="chart-kind"
            checked={props.chartKind === 'none'}
            onChange={() => props.onChartKindChange('none')}
          />
          —
        </label>
        <label className="admin-page-form-checkbox">
          <input
            type="radio"
            name="chart-kind"
            checked={props.chartKind === 'chordpro'}
            onChange={() => props.onChartKindChange('chordpro')}
          />
          {t('catalog.chartChordpro')}
        </label>
        <label className="admin-page-form-checkbox">
          <input
            type="radio"
            name="chart-kind"
            checked={props.chartKind === 'pdf'}
            onChange={() => props.onChartKindChange('pdf')}
          />
          {t('catalog.chartPdf')}
        </label>
        <label className="admin-page-form-checkbox">
          <input
            type="radio"
            name="chart-kind"
            checked={props.chartKind === 'image'}
            onChange={() => props.onChartKindChange('image')}
          />
          {t('catalog.chartImage')}
        </label>
        {props.chartKind === 'chordpro' ? (
          <textarea
            value={props.chordproText}
            onChange={(event) => props.onChordproChange(event.target.value)}
            className="admin-page-form-input chordpro-textarea"
            rows={10}
            maxLength={64_000}
          />
        ) : null}
        {props.chartKind === 'pdf' ? (
          <input
            type="text"
            value={props.pdfS3Key}
            onChange={(event) => props.onPdfKeyChange(event.target.value)}
            className="admin-page-form-input"
            placeholder="pdf s3 key"
          />
        ) : null}
        {props.chartKind === 'image' ? (
          <input
            type="text"
            value={props.imageS3Key}
            onChange={(event) => props.onImageKeyChange(event.target.value)}
            className="admin-page-form-input"
            placeholder="image s3 key"
          />
        ) : null}
      </fieldset>
    </>
  );
}
