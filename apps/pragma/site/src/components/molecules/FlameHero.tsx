/** @Feature streaks */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { BlazeMark } from '../atoms/BlazeMark';
import { BonfireMark } from '../atoms/BonfireMark';
import type { FlameTone } from '../atoms/flame-mark.utils';
import { Overline } from '../atoms/Overline';

export type FlameScope = 'personal' | 'band';

const FLAME_HERO = {
  personal: { Mark: BlazeMark, titleKey: 'streaks.mineTitle' },
  band: { Mark: BonfireMark, titleKey: 'streaks.bandTitle' },
} as const;

export interface FlameHeroProps {
  readonly scope: FlameScope;
  readonly tone: FlameTone;
  readonly days: number;
}

// @FollowsBlueprint molecule-presentational
export function FlameHero({ scope, tone, days }: FlameHeroProps): JSX.Element {
  const { t } = useTranslation();
  const { Mark, titleKey } = FLAME_HERO[scope];
  const title = t(titleKey);
  return (
    <section aria-label={title} className="flex items-center gap-3">
      <Mark tone={tone} size="lg" />
      <div className="flex min-w-0 flex-col">
        <Overline>{title}</Overline>
        <span className="font-display text-display text-ink tabular-nums">
          {t('streaks.days', { count: days })}
        </span>
      </div>
    </section>
  );
}
