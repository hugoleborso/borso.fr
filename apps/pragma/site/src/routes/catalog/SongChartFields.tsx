/**
 * Chord chart variant + tonality + base-energy fields. Extracted from
 * SongDetailPage so the parent stays under the file-length limit.
 */

import { useTranslation } from 'react-i18next';
import { Input } from '../../components/atoms/Input';

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

const LABEL_CLASS = 'text-[11px] tracking-wider uppercase text-ink-400 font-medium';
const RADIO_LABEL_CLASS = 'flex items-center gap-2 text-sm text-ink-700 cursor-pointer';

export function SongChartFields(props: SongChartFieldsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
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

      <fieldset className="border border-line rounded-md p-3 mt-2">
        <legend className={`${LABEL_CLASS} px-2`}>{t('catalog.chordChart')}</legend>
        <div className="flex flex-wrap gap-3">
          <label className={RADIO_LABEL_CLASS}>
            <input
              type="radio"
              name="chart-kind"
              checked={props.chartKind === 'none'}
              onChange={() => props.onChartKindChange('none')}
            />
            —
          </label>
          <label className={RADIO_LABEL_CLASS}>
            <input
              type="radio"
              name="chart-kind"
              checked={props.chartKind === 'chordpro'}
              onChange={() => props.onChartKindChange('chordpro')}
            />
            {t('catalog.chartChordpro')}
          </label>
          <label className={RADIO_LABEL_CLASS}>
            <input
              type="radio"
              name="chart-kind"
              checked={props.chartKind === 'pdf'}
              onChange={() => props.onChartKindChange('pdf')}
            />
            {t('catalog.chartPdf')}
          </label>
          <label className={RADIO_LABEL_CLASS}>
            <input
              type="radio"
              name="chart-kind"
              checked={props.chartKind === 'image'}
              onChange={() => props.onChartKindChange('image')}
            />
            {t('catalog.chartImage')}
          </label>
        </div>
        {props.chartKind === 'chordpro' ? (
          <textarea
            value={props.chordproText}
            onChange={(event) => props.onChordproChange(event.target.value)}
            className="w-full bg-bg border border-line rounded-md px-3 py-2 mt-3 text-[13px] font-mono text-ink-700 outline-none focus:border-ink-700 resize-y"
            rows={10}
            maxLength={64_000}
          />
        ) : null}
        {props.chartKind === 'pdf' ? (
          <Input
            type="text"
            value={props.pdfS3Key}
            onChange={(event) => props.onPdfKeyChange(event.target.value)}
            placeholder="pdf s3 key"
            className="mt-3"
          />
        ) : null}
        {props.chartKind === 'image' ? (
          <Input
            type="text"
            value={props.imageS3Key}
            onChange={(event) => props.onImageKeyChange(event.target.value)}
            placeholder="image s3 key"
            className="mt-3"
          />
        ) : null}
      </fieldset>
    </>
  );
}
