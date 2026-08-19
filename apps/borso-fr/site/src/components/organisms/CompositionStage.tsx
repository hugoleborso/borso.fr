import { useTranslation } from 'react-i18next';
import type { AnimationMode } from '../../art/mondrian/animation.core';
import { formatWorkNumber } from '../../art/mondrian/mondrian-labels.core';
import type { ColoredRect } from '../../art/mondrian/painting.utils';
import type { Palette } from '../../art/mondrian/palettes.utils';
import { seedToHex } from '../../art/mondrian/url-state.utils';
import { MondrianFrame } from './MondrianFrame';

/**
 * A short desktop window trades the stage's vertical padding for canvas, which
 * a width breakpoint alone cannot express.
 */
const STAGE_CLASS_NAME =
  'relative flex min-h-[100dvh] flex-col items-center justify-start gap-3.5 px-4 pt-[72px] pb-8 atelier-roomy:gap-[clamp(16px,2vw,28px)] atelier-roomy:px-6 atelier-roomy:pt-20 atelier-roomy:pb-12 atelier-desk:px-[clamp(24px,4vw,56px)] atelier-desk:pt-[clamp(28px,4vw,56px)] atelier-desk:pb-[clamp(40px,5vw,80px)] [@media(max-height:700px)_and_(min-width:961px)]:pt-6 [@media(max-height:700px)_and_(min-width:961px)]:pb-6';

const STAGE_HEAD_CLASS_NAME =
  'flex w-full max-w-[880px] flex-wrap items-end justify-between gap-6 atelier-desk:flex-nowrap [@media(max-height:700px)_and_(min-width:961px)]:max-w-full';

const FRAME_WRAP_CLASS_NAME =
  'relative flex aspect-square w-full max-w-full items-center justify-center atelier-roomy:max-w-[min(100%,calc(100dvh-280px))] atelier-desk:max-w-[min(880px,calc(100dvh-240px))] [@media(max-height:700px)_and_(min-width:961px)]:max-w-[min(880px,calc(100dvh-180px))]';

interface CompositionStageProps {
  seed: number;
  title: string;
  paletteLabel: string;
  fieldCount: number;
  todayLabel: string;
  rectangles: readonly ColoredRect[];
  palette: Palette;
  lineWeight: number;
  animationMode: AnimationMode;
  isReducedMotion: boolean;
  onCompose: () => void;
}

// @FollowsBlueprint organism-presentational
export function CompositionStage({
  seed,
  title,
  paletteLabel,
  fieldCount,
  todayLabel,
  rectangles,
  palette,
  lineWeight,
  animationMode,
  isReducedMotion,
  onCompose,
}: CompositionStageProps) {
  const { t } = useTranslation();

  return (
    <main className={STAGE_CLASS_NAME}>
      <div className={STAGE_HEAD_CLASS_NAME}>
        <div>
          <div className="font-atelier-mono text-[10px] tracking-[0.28em] text-atelier-ink-soft uppercase opacity-60">
            {t('mondrian.stage.work-number', { number: formatWorkNumber(seed) })}
          </div>
          <h2 className="mt-1 mb-0 font-atelier-serif text-[18px] leading-[1.1] text-atelier-ink italic atelier-roomy:text-[24px]">
            <i>{title}</i>
          </h2>
        </div>
        <div className="text-left font-atelier-mono text-[10px] tracking-[0.18em] text-atelier-ink-soft uppercase opacity-[0.65] atelier-desk:text-right">
          {paletteLabel}
          <br />
          {t('mondrian.stage.meta', { count: fieldCount, date: todayLabel })}
        </div>
      </div>

      <div className={FRAME_WRAP_CLASS_NAME}>
        <MondrianFrame
          rectangles={rectangles}
          palette={palette}
          lineWeight={lineWeight}
          drawKey={`${seed}-${fieldCount}`}
          animationMode={animationMode}
          isReducedMotion={isReducedMotion}
          onCompose={onCompose}
        />
      </div>

      <button
        type="button"
        className="inline-block cursor-pointer border border-atelier-ink bg-atelier-ink px-6 py-3.5 font-atelier-serif text-[16px] font-medium tracking-[0.02em] text-atelier-paper italic atelier-desk:hidden"
        onClick={onCompose}
      >
        {t('mondrian.action.compose')}{' '}
        <span className="ml-1.5 inline-block" aria-hidden="true">
          →
        </span>
      </button>

      <div className="flex w-full max-w-[880px] flex-col items-start gap-1.5 font-atelier-serif-soft text-[12px] text-atelier-ink-soft italic opacity-70 atelier-roomy:flex-row atelier-roomy:items-center atelier-roomy:justify-between atelier-roomy:gap-0 atelier-roomy:text-[14px]">
        <span className="font-atelier-mono text-[10px] tracking-[0.2em] not-italic uppercase">
          {t('mondrian.stage.seed', { seed: seedToHex(seed) })}
        </span>
        <span className="inline [@media(pointer:coarse)]:hidden">
          <i>{t('mondrian.stage.hint-fine-before')}</i>{' '}
          <span className="mx-1 border border-atelier-rule-strong px-2 py-0.5 font-atelier-mono text-[11px] not-italic">
            {t('mondrian.stage.hint-fine-key')}
          </span>{' '}
          <i>{t('mondrian.stage.hint-fine-after')}</i>
        </span>
        <span className="hidden [@media(pointer:coarse)]:inline">
          <i>{t('mondrian.stage.hint-coarse')}</i>
        </span>
      </div>
    </main>
  );
}
