import type { JSX } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { StateDot } from '../atoms/StateDot';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface RecurringTaskRowProps {
  readonly title: string;
  readonly cadence: string;
  readonly isDue: boolean;
  readonly stateLabel: string;
  readonly lastRun: string;
  readonly lastRunLabel: string;
  readonly nextRun: string;
  readonly nextRunLabel: string;
  readonly what: string;
  readonly routine: string;
  readonly onLongPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function RecurringTaskRow({
  title,
  cadence,
  isDue,
  stateLabel,
  lastRun,
  lastRunLabel,
  nextRun,
  nextRunLabel,
  what,
  routine,
  onLongPress,
}: RecurringTaskRowProps): JSX.Element {
  const press = usePressGesture({ onLongPress });
  return (
    <li className="border-b border-line last:border-b-0">
      <details className="group">
        <summary
          {...press.handlers}
          className={composeClassName(
            'flex items-center gap-1 min-h-11 pr-3 cursor-pointer list-none',
            PRESSABLE_CLASS_NAME,
          )}
        >
          <span className="flex items-center justify-center w-9 h-11 shrink-0">
            <StateDot isAlert={isDue} label={stateLabel} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm text-ink truncate">{title}</span>
            <span className="block text-caption text-ink-muted truncate">
              {cadence} · <span className="sr-only">{lastRunLabel} </span>
              {lastRun} → <span className="sr-only">{nextRunLabel} </span>
              <span className={isDue ? 'font-semibold text-danger' : undefined}>{nextRun}</span>
            </span>
          </span>
          <Icon
            name="chevron"
            size={16}
            className="text-ink-muted transition-transform group-open:rotate-90"
          />
        </summary>
        <div className="pl-10 pr-3 pb-3">
          <p className="m-0 text-body-sm text-ink-soft">{what}</p>
          <p className="m-0 mt-1 text-caption text-ink-muted">{routine}</p>
        </div>
      </details>
    </li>
  );
}
