/** @Feature setlists */

import type { JSX } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { type EnergyBar, selectEnergyBarClass } from './energy-curve.utils';

const PERCENT_SCALE = 100;

export interface EnergyCurveProps {
  readonly bars: readonly EnergyBar[];
  readonly liftedId: string | null;
}

// @FollowsBlueprint molecule-presentational
export function EnergyCurve({ bars, liftedId }: EnergyCurveProps): JSX.Element {
  return (
    <div aria-hidden="true" data-energy-curve className="flex h-14 items-end gap-0.5">
      {bars.map((bar) => (
        <span
          key={bar.id}
          data-lifted={bar.id === liftedId}
          className={composeClassName(
            'min-w-0 flex-1 rounded-t-sm transition-[height] duration-150',
            selectEnergyBarClass(bar, liftedId),
          )}
          style={{ height: `${bar.heightRatio * PERCENT_SCALE}%` }}
        />
      ))}
    </div>
  );
}
