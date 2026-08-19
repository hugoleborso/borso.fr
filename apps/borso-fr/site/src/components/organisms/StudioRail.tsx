import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { ANIMATION_MODE_LIST, type AnimationMode } from '../../art/mondrian/animation.core';
import {
  type CustomColorSlot,
  formatBalancePercentage,
  PALETTE_KEY_LIST,
  selectAnimationLabelKey,
  selectPaletteLabelKey,
  selectRailClassName,
} from '../../art/mondrian/mondrian-labels.core';
import type { CustomColors, Palette, PaletteKey } from '../../art/mondrian/palettes.utils';
import { ControlField } from '../atoms/ControlField';
import { SegmentedControl } from '../atoms/SegmentedControl';
import { PaletteSwatchRow } from './PaletteSwatchRow';

const COMPLEXITY_MIN = 6;
const COMPLEXITY_MAX = 60;
const LINE_WEIGHT_MIN = 1;
const LINE_WEIGHT_MAX = 14;
const BALANCE_MIN = 0;
const BALANCE_MAX = 1;
const BALANCE_STEP = 0.01;
const SINGLE_STEP = 1;

const RAIL_CLASS_NAME =
  'fixed top-0 right-0 left-0 z-20 h-auto max-h-[88dvh] overflow-y-auto border-b border-atelier-rule-strong bg-atelier-paper bg-[image:var(--sheen-atelier)] px-[22px] pt-8 pb-10 shadow-atelier transition-[translate] duration-[360ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-atelier-rule atelier-roomy:px-[clamp(24px,2.4vw,38px)] atelier-roomy:pt-[clamp(28px,4vw,44px)] atelier-roomy:pb-14 atelier-desk:sticky atelier-desk:top-0 atelier-desk:right-auto atelier-desk:left-auto atelier-desk:z-auto atelier-desk:h-[100dvh] atelier-desk:max-h-none atelier-desk:translate-y-0 atelier-desk:border-r atelier-desk:border-b-0 atelier-desk:border-atelier-rule atelier-desk:shadow-none atelier-desk:transition-none';

const SECTION_LABEL_CLASS_NAME =
  "mt-0 mb-3.5 flex items-center gap-2.5 font-atelier-mono text-[10px] tracking-[0.28em] text-atelier-ink-soft uppercase opacity-[0.65] after:h-px after:flex-1 after:bg-atelier-rule after:content-['']";

const SLIDER_CLASS_NAME =
  'w-full min-h-11 cursor-pointer appearance-none bg-transparent outline-none focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-atelier-ink [&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-atelier-rule-strong [&::-moz-range-track]:h-px [&::-moz-range-track]:bg-atelier-rule-strong [&::-webkit-slider-thumb]:-mt-[6.5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-atelier-ink [&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(26,23,20,0.25)] [&::-webkit-slider-thumb]:transition-[scale] [&::-webkit-slider-thumb]:duration-[120ms] hover:[&::-webkit-slider-thumb]:scale-[1.15] active:[&::-webkit-slider-thumb]:scale-[1.3] [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-atelier-ink [&::-moz-range-thumb]:shadow-[0_2px_6px_rgba(26,23,20,0.25)]';

const BUTTON_CLASS_NAME =
  'group relative cursor-pointer overflow-hidden border border-atelier-ink px-3.5 py-3 font-atelier-serif text-[14px] font-medium tracking-[0.02em] italic transition-[background-color,color,translate] duration-[180ms] hover:-translate-y-px focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-atelier-ink atelier-roomy:px-[18px] atelier-roomy:py-3.5 atelier-roomy:text-[16px]';

const ARROW_CLASS_NAME =
  'ml-1.5 inline-block transition-[translate] duration-[180ms] group-hover:translate-x-[3px]';

interface StudioRailProps {
  isRailOpen: boolean;
  complexity: number;
  lineWeight: number;
  balance: number;
  paletteKey: PaletteKey;
  palette: Palette;
  customColors: CustomColors;
  animationMode: AnimationMode;
  onComplexityChange: (nextComplexity: number) => void;
  onLineWeightChange: (nextLineWeight: number) => void;
  onBalanceChange: (nextBalance: number) => void;
  onPaletteKeyChange: (nextPaletteKey: PaletteKey) => void;
  onCustomColorChange: (slot: CustomColorSlot, nextHex: string) => void;
  onAnimationModeChange: (nextMode: AnimationMode) => void;
  onCompose: () => void;
  onDownload: () => void;
}

// @FollowsBlueprint organism-presentational
export function StudioRail({
  isRailOpen,
  complexity,
  lineWeight,
  balance,
  paletteKey,
  palette,
  customColors,
  animationMode,
  onComplexityChange,
  onLineWeightChange,
  onBalanceChange,
  onPaletteKeyChange,
  onCustomColorChange,
  onAnimationModeChange,
  onCompose,
  onDownload,
}: StudioRailProps) {
  const { t } = useTranslation();

  return (
    <aside
      className={clsx(RAIL_CLASS_NAME, selectRailClassName(isRailOpen))}
      aria-label={t('mondrian.rail.label')}
    >
      <div className="flex items-center gap-2.5 font-atelier-mono text-[10px] tracking-[0.28em] text-atelier-ink-soft uppercase opacity-70">
        <span className="inline-block h-2 w-2 bg-atelier-ink" aria-hidden="true" />
        <span>{t('mondrian.brandmark')}</span>
      </div>
      <h1 className="mt-[18px] mb-1.5 w-full font-atelier-serif text-[38px] leading-[0.95] font-normal tracking-[-0.01em] text-atelier-ink italic atelier-roomy:text-[44px] atelier-desk:text-[clamp(38px,4.2vw,56px)]">
        <i>{t('mondrian.title')}</i>
        <span className="mt-3.5 block font-atelier-mono text-[11px] tracking-[0.3em] not-italic uppercase opacity-60">
          {t('mondrian.generator-tag')}
        </span>
      </h1>
      <p className="mt-0 mb-7 w-full max-w-[32ch] font-atelier-serif-soft text-[17px] leading-[1.45] font-light text-atelier-ink-soft italic opacity-80">
        {t('mondrian.subtitle-before-de-stijl')} <i>{t('mondrian.subtitle-de-stijl')}</i>
        {t('mondrian.subtitle-after-de-stijl')}
      </p>

      <div className="my-6 h-px bg-atelier-rule-strong" />

      <div className={SECTION_LABEL_CLASS_NAME}>{t('mondrian.section.composition')}</div>

      <ControlField
        label={t('mondrian.field.complexity')}
        value={t('mondrian.field.complexity-value', { count: Math.round(complexity) })}
      >
        <input
          type="range"
          min={COMPLEXITY_MIN}
          max={COMPLEXITY_MAX}
          step={SINGLE_STEP}
          value={complexity}
          onChange={(event) => {
            onComplexityChange(Number(event.target.value));
          }}
          className={SLIDER_CLASS_NAME}
          aria-label={t('mondrian.field.complexity')}
        />
      </ControlField>

      <ControlField
        label={t('mondrian.field.line-weight')}
        value={t('mondrian.field.line-weight-value', { weight: lineWeight })}
      >
        <input
          type="range"
          min={LINE_WEIGHT_MIN}
          max={LINE_WEIGHT_MAX}
          step={SINGLE_STEP}
          value={lineWeight}
          onChange={(event) => {
            onLineWeightChange(Number(event.target.value));
          }}
          className={SLIDER_CLASS_NAME}
          aria-label={t('mondrian.field.line-weight')}
        />
      </ControlField>

      <ControlField
        label={t('mondrian.field.colour-balance')}
        value={t('mondrian.field.colour-balance-value', {
          percentage: formatBalancePercentage(balance),
        })}
      >
        <input
          type="range"
          min={BALANCE_MIN}
          max={BALANCE_MAX}
          step={BALANCE_STEP}
          value={balance}
          onChange={(event) => {
            onBalanceChange(Number(event.target.value));
          }}
          className={SLIDER_CLASS_NAME}
          aria-label={t('mondrian.field.colour-balance')}
        />
      </ControlField>

      <div className="my-6 h-px bg-atelier-rule" />

      <div className={SECTION_LABEL_CLASS_NAME}>{t('mondrian.section.palette')}</div>
      <SegmentedControl
        layout="five"
        legend={t('mondrian.palette.legend')}
        value={paletteKey}
        onValueChange={onPaletteKeyChange}
        options={PALETTE_KEY_LIST.map((candidate) => ({
          value: candidate,
          label: t(selectPaletteLabelKey(candidate)),
        }))}
      />
      <PaletteSwatchRow
        paletteKey={paletteKey}
        palette={palette}
        customColors={customColors}
        onCustomColorChange={onCustomColorChange}
      />

      <div className="mt-9 mb-6 h-px bg-atelier-rule" />

      <div className={SECTION_LABEL_CLASS_NAME}>{t('mondrian.section.animation')}</div>
      <SegmentedControl
        layout="four"
        legend={t('mondrian.animation.legend')}
        value={animationMode}
        onValueChange={onAnimationModeChange}
        options={ANIMATION_MODE_LIST.map((candidate) => ({
          value: candidate,
          label: t(selectAnimationLabelKey(candidate)),
        }))}
      />

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          className={clsx(
            BUTTON_CLASS_NAME,
            'bg-atelier-ink text-atelier-paper hover:bg-atelier-ink-soft',
          )}
          onClick={onCompose}
        >
          {t('mondrian.action.compose')}{' '}
          <span className={ARROW_CLASS_NAME} aria-hidden="true">
            →
          </span>
        </button>
        <button
          type="button"
          className={clsx(
            BUTTON_CLASS_NAME,
            'bg-atelier-paper text-atelier-ink hover:bg-atelier-ink hover:text-atelier-paper',
          )}
          onClick={onDownload}
        >
          {t('mondrian.action.download')}
        </button>
      </div>

      <p className="mt-9 w-full max-w-[36ch] font-atelier-serif-soft text-[13px] leading-[1.55] text-atelier-ink-soft italic opacity-55">
        <b className="mb-1 block font-atelier-mono text-[9px] font-normal tracking-[0.24em] not-italic uppercase opacity-80">
          {t('mondrian.credit.heading')}
        </b>
        {t('mondrian.credit.body')}{' '}
        <span className="inline [@media(pointer:coarse)]:hidden">
          {t('mondrian.credit.hint-fine')}
        </span>
        <span className="hidden [@media(pointer:coarse)]:inline">
          {t('mondrian.credit.hint-coarse')}
        </span>
        {t('mondrian.credit.tail-before-cascade')} <i>{t('mondrian.credit.tail-cascade')}</i>{' '}
        {t('mondrian.credit.tail-after-cascade')}
      </p>
    </aside>
  );
}
