import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Announcer } from '../../components/atoms/Announcer';
import { CompositionStage } from '../../components/organisms/CompositionStage';
import { StudioRail } from '../../components/organisms/StudioRail';
import { type AnimationMode, isCascadeMode } from './animation.core';
import { applyCascade } from './cascade-timer';
import { changePaletteInUrl, composeNewSeed, useCompositionState } from './composition-url';
import { downloadCompositionPng } from './download';
import {
  type CustomColorSlot,
  selectPaletteLabelKey,
  selectRailToggleLabelKey,
} from './mondrian-labels.core';
import { colorize, generateLayout } from './painting.utils';
import { applyPaperTheme } from './paper-theme';
import {
  CUSTOM_DEFAULTS,
  type CustomColors,
  type PaletteKey,
  selectPalette,
} from './palettes.utils';
import { buildTitle } from './titles.utils';
import { useIsReducedMotion } from './use-reduced-motion.hook';

const RAIL_TOGGLE_CLASS_NAME =
  'fixed top-4 right-4 z-30 block min-h-11 cursor-pointer border border-atelier-ink bg-atelier-paper px-3.5 py-2.5 font-atelier-serif text-[14px] text-atelier-ink italic focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-atelier-ink atelier-desk:hidden';

const DEFAULT_COMPLEXITY = 22;
const DEFAULT_LINE_WEIGHT = 6;
const DEFAULT_BALANCE = 0.5;

const TODAY = new Date();
const TODAY_LABEL_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

function onPaletteKeyChange(nextPaletteKey: PaletteKey): void {
  applyPaperTheme(nextPaletteKey);
  changePaletteInUrl(nextPaletteKey);
}

export function App() {
  const { t, i18n } = useTranslation();
  const isReducedMotion = useIsReducedMotion();
  const { seed, paletteKey } = useCompositionState();

  const [customColors, setCustomColors] = useState<CustomColors>(CUSTOM_DEFAULTS);
  const [complexity, setComplexity] = useState(DEFAULT_COMPLEXITY);
  const [lineWeight, setLineWeight] = useState(DEFAULT_LINE_WEIGHT);
  const [balance, setBalance] = useState(DEFAULT_BALANCE);
  const [animationMode, setAnimationMode] = useState<AnimationMode>('still');
  const [isRailOpen, setIsRailOpen] = useState(false);

  const palette = useMemo(
    () => selectPalette(paletteKey, customColors),
    [paletteKey, customColors],
  );
  const fieldCount = Math.round(complexity);
  const layout = useMemo(() => generateLayout({ seed, complexity }), [seed, complexity]);
  const rectangles = useMemo(
    () => colorize(layout, { seed, palette, balance }),
    [layout, palette, seed, balance],
  );
  const title = useMemo(
    () => buildTitle(seed, rectangles, palette, t),
    [seed, rectangles, palette, t],
  );

  const onAnimationModeChange = (nextMode: AnimationMode) => {
    setAnimationMode(nextMode);
    applyCascade(isCascadeMode(nextMode, isReducedMotion));
  };

  const onCustomColorChange = (slot: CustomColorSlot, nextHex: string) => {
    setCustomColors((previousColors) => ({ ...previousColors, [slot]: nextHex }));
  };

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 atelier-desk:grid-cols-[clamp(320px,26vw,400px)_1fr]">
      <button
        type="button"
        className={RAIL_TOGGLE_CLASS_NAME}
        onClick={() => {
          setIsRailOpen((wasOpen) => !wasOpen);
        }}
        aria-expanded={isRailOpen}
      >
        {t(selectRailToggleLabelKey(isRailOpen))}
      </button>

      <StudioRail
        isRailOpen={isRailOpen}
        complexity={complexity}
        lineWeight={lineWeight}
        balance={balance}
        paletteKey={paletteKey}
        palette={palette}
        customColors={customColors}
        animationMode={animationMode}
        onComplexityChange={setComplexity}
        onLineWeightChange={setLineWeight}
        onBalanceChange={setBalance}
        onPaletteKeyChange={onPaletteKeyChange}
        onCustomColorChange={onCustomColorChange}
        onAnimationModeChange={onAnimationModeChange}
        onCompose={composeNewSeed}
        onDownload={() => {
          downloadCompositionPng({ rects: rectangles, palette, lineWeight, seed });
        }}
      />

      <CompositionStage
        seed={seed}
        title={title}
        paletteLabel={t(selectPaletteLabelKey(paletteKey))}
        fieldCount={fieldCount}
        todayLabel={TODAY.toLocaleDateString(i18n.language, TODAY_LABEL_FORMAT)}
        rectangles={rectangles}
        palette={palette}
        lineWeight={lineWeight}
        animationMode={animationMode}
        isReducedMotion={isReducedMotion}
        onCompose={composeNewSeed}
      />

      <Announcer message={title} />
    </div>
  );
}
