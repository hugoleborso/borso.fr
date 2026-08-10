import { useTranslation } from 'react-i18next';
import type { AnimationMode } from '../../art/mondrian/animation.core';
import { formatWorkNumber } from '../../art/mondrian/mondrian-labels.core';
import type { ColoredRect } from '../../art/mondrian/painting.utils';
import type { Palette } from '../../art/mondrian/palettes.utils';
import { seedToHex } from '../../art/mondrian/url-state.utils';
import { MondrianFrame } from './MondrianFrame';

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
    <main className="stage">
      <div className="stage-head">
        <div>
          <div className="work-no">
            {t('mondrian.stage.work-number', { number: formatWorkNumber(seed) })}
          </div>
          <h2 className="work-title">
            <i>{title}</i>
          </h2>
        </div>
        <div className="meta">
          {paletteLabel}
          <br />
          {t('mondrian.stage.meta', { count: fieldCount, date: todayLabel })}
        </div>
      </div>

      <div className="frame-wrap">
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

      <button type="button" className="stage-compose" onClick={onCompose}>
        {t('mondrian.action.compose')}{' '}
        <span className="arrow" aria-hidden="true">
          →
        </span>
      </button>

      <div className="stage-foot">
        <span className="seed">{t('mondrian.stage.seed', { seed: seedToHex(seed) })}</span>
        <span className="hint-fine">
          <i>{t('mondrian.stage.hint-fine-before')}</i>{' '}
          <span className="kbd">{t('mondrian.stage.hint-fine-key')}</span>{' '}
          <i>{t('mondrian.stage.hint-fine-after')}</i>
        </span>
        <span className="hint-coarse">
          <i>{t('mondrian.stage.hint-coarse')}</i>
        </span>
      </div>
    </main>
  );
}
