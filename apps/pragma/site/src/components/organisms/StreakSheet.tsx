/** @Feature streaks */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { StreaksView } from '../../lib/queries/streaks.queries';
import { BlazeMark } from '../atoms/BlazeMark';
import { BonfireMark } from '../atoms/BonfireMark';
import { Overline } from '../atoms/Overline';
import { selectFlameStatusKey, selectFlameTone } from '../molecules/flame-tone.core';
import { Sheet } from '../molecules/Sheet';

export interface StreakSheetProps {
  readonly view: StreaksView;
  readonly onClose: () => void;
}

// @FollowsBlueprint organism-presentational
export function StreakSheet({ view, onClose }: StreakSheetProps): JSX.Element {
  const { t } = useTranslation();
  const title = t('streaks.sheetTitle');
  return (
    <Sheet title={title} label={title} onClose={onClose}>
      <div className="flex flex-col gap-5 pb-2">
        <section className="flex items-center gap-3">
          <BlazeMark tone={selectFlameTone(view.mine)} size="lg" />
          <div className="flex min-w-0 flex-col">
            <span className="font-display text-display leading-none text-ink tabular-nums">
              {view.mine.days}
            </span>
            <p className="m-0 text-meta text-ink-soft first-letter:uppercase">
              {t(selectFlameStatusKey(view.mine))}
            </p>
            <p className="m-0 text-meta text-ink-soft">
              {t('streaks.jokersLeft', { count: view.mine.jokersLeftThisWeek })}
            </p>
          </div>
        </section>

        <section className="flex items-center gap-3">
          <BonfireMark tone={selectFlameTone(view.band)} size="md" />
          <div className="flex min-w-0 flex-auto flex-col">
            <Overline>{t('streaks.bandTitle')}</Overline>
            <p className="m-0 text-meta text-ink-soft first-letter:uppercase">
              {t(selectFlameStatusKey(view.band))}
            </p>
          </div>
          <span className="text-heading text-ink tabular-nums">{view.band.days}</span>
        </section>
      </div>
    </Sheet>
  );
}
