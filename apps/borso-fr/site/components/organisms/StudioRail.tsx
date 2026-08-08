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
const ANIMATION_RULE_MARGIN_TOP_PX = 36;

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
    <aside className={selectRailClassName(isRailOpen)} aria-label={t('mondrian.rail.label')}>
      <div className="brandmark">
        <span className="dot" aria-hidden="true" />
        <span>{t('mondrian.brandmark')}</span>
      </div>
      <h1 className="title">
        <i>{t('mondrian.title')}</i>
        <span className="gen-tag">{t('mondrian.generator-tag')}</span>
      </h1>
      <p className="subtitle">
        {t('mondrian.subtitle-before-de-stijl')} <i>{t('mondrian.subtitle-de-stijl')}</i>
        {t('mondrian.subtitle-after-de-stijl')}
      </p>

      <div className="rule strong" />

      <div className="section-label">{t('mondrian.section.composition')}</div>

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
          className="slider"
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
          className="slider"
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
          className="slider"
          aria-label={t('mondrian.field.colour-balance')}
        />
      </ControlField>

      <div className="rule" />

      <div className="section-label">{t('mondrian.section.palette')}</div>
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

      <div className="rule" style={{ marginTop: ANIMATION_RULE_MARGIN_TOP_PX }} />

      <div className="section-label">{t('mondrian.section.animation')}</div>
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

      <div className="btn-row">
        <button type="button" className="btn primary" onClick={onCompose}>
          {t('mondrian.action.compose')} <span className="arrow">→</span>
        </button>
        <button type="button" className="btn ghost" onClick={onDownload}>
          {t('mondrian.action.download')}
        </button>
      </div>

      <p className="credit">
        <b>{t('mondrian.credit.heading')}</b>
        {t('mondrian.credit.body')}{' '}
        <span className="hint-fine">{t('mondrian.credit.hint-fine')}</span>
        <span className="hint-coarse">{t('mondrian.credit.hint-coarse')}</span>
        {t('mondrian.credit.tail-before-cascade')} <i>{t('mondrian.credit.tail-cascade')}</i>{' '}
        {t('mondrian.credit.tail-after-cascade')}
      </p>
    </aside>
  );
}
