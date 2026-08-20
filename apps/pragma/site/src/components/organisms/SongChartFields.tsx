/**
 * Chord chart variant + tonality + base-energy fields. Extracted from
 * SongDetailPage so the parent stays under the file-length limit.
 * @Feature songs
 */

import { useTranslation } from 'react-i18next';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { Input } from '../atoms/Input';
import { composeClassName } from '../atoms/class-name.utils';
import { FileDrop } from './FileDrop';

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

const LABEL_CLASS = 'text-xs tracking-wider uppercase text-ink-400 font-medium';
/**
 * No negative margin pulling the padding back out: the tap box is what the
 * layout reserves, and `px-2 -mx-2` grew it eight pixels past the slot, so two
 * neighbours in this row overlapped by four pixels and the later one won the
 * hit test on the earlier one's right edge.
 */
const RADIO_LABEL_CLASS =
  'inline-flex items-center gap-2 min-h-11 px-2 rounded-md text-sm text-ink-700 cursor-pointer';
const RADIO_INPUT_CLASS = 'w-5 h-5 accent-accent';

// @FollowsBlueprint organism-presentational
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
        <legend className={composeClassName(LABEL_CLASS, 'px-2')}>{t('catalog.chordChart')}</legend>
        <div className="flex flex-wrap gap-3">
          <label className={RADIO_LABEL_CLASS}>
            <input
              type="radio"
              name="chart-kind"
              className={RADIO_INPUT_CLASS}
              checked={props.chartKind === 'none'}
              onChange={() => props.onChartKindChange('none')}
            />
            —
          </label>
          <label className={RADIO_LABEL_CLASS}>
            <input
              type="radio"
              name="chart-kind"
              className={RADIO_INPUT_CLASS}
              checked={props.chartKind === 'chordpro'}
              onChange={() => props.onChartKindChange('chordpro')}
            />
            {t('catalog.chartChordpro')}
          </label>
          <label className={RADIO_LABEL_CLASS}>
            <input
              type="radio"
              name="chart-kind"
              className={RADIO_INPUT_CLASS}
              checked={props.chartKind === 'pdf'}
              onChange={() => props.onChartKindChange('pdf')}
            />
            {t('catalog.chartPdf')}
          </label>
          <label className={RADIO_LABEL_CLASS}>
            <input
              type="radio"
              name="chart-kind"
              className={RADIO_INPUT_CLASS}
              checked={props.chartKind === 'image'}
              onChange={() => props.onChartKindChange('image')}
            />
            {t('catalog.chartImage')}
          </label>
        </div>
        <SongChartEditor {...props} />
      </fieldset>
    </>
  );
}

const CHORDPRO_MAX_LENGTH = 64_000;
const CHORDPRO_ROWS = 10;

/**
 * The editor the selected chart variant needs, or nothing when the song
 * carries no chart. One guard per variant, so the fieldset above holds no
 * condition of its own.
 */
function SongChartEditor(props: SongChartFieldsProps): JSX.Element | null {
  const keySetterByUploadKind = {
    pdf: props.onPdfKeyChange,
    image: props.onImageKeyChange,
  } as const;

  if (props.chartKind === 'chordpro') {
    return (
      <AutoGrowTextarea
        value={props.chordproText}
        onChange={(event) => props.onChordproChange(event.target.value)}
        className="mt-3 font-mono"
        rows={CHORDPRO_ROWS}
        maxLength={CHORDPRO_MAX_LENGTH}
      />
    );
  }
  if (props.chartKind === 'pdf') {
    return (
      <FileDrop
        className="mt-3"
        songId={props.songId}
        currentObjectKey={props.pdfS3Key}
        onUploaded={(result) => keySetterByUploadKind[result.kind](result.objectKey)}
        onRemoved={() => props.onPdfKeyChange('')}
      />
    );
  }
  if (props.chartKind === 'image') {
    return (
      <FileDrop
        className="mt-3"
        songId={props.songId}
        currentObjectKey={props.imageS3Key}
        onUploaded={(result) => keySetterByUploadKind[result.kind](result.objectKey)}
        onRemoved={() => props.onImageKeyChange('')}
      />
    );
  }
  return null;
}
