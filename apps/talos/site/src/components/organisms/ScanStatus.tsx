import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '../atoms/button.variants';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { buildEnvironmentAddress } from '../../lib/claude-code-address.core';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';
import { useClaudeCodeTarget } from '../../lib/queries/messages.queries';
import { measureAge } from '../../lib/relative-age.utils';
import {
  type LastRunsShape,
  listFailedSources,
  type RunReportShape,
  selectAgeLabelKey,
} from './scan-status.core';

export interface ScanStatusProps {
  readonly lastRuns: LastRunsShape | null;
}

function RunAge({
  icon,
  report,
  now,
}: {
  readonly icon: IconName;
  readonly report: RunReportShape | null;
  readonly now: number;
}): JSX.Element {
  const { t } = useTranslation();
  const age = report === null ? null : measureAge(report.at, now);
  return (
    <span className="inline-flex items-center gap-0.5">
      <Icon name={icon} size={13} />
      {age === null ? t('age.never') : t(selectAgeLabelKey(age.unit), { count: age.value })}
    </span>
  );
}

function LastRunsPill({ lastRuns }: { readonly lastRuns: LastRunsShape }): JSX.Element {
  const { t } = useTranslation();
  const [now] = useState(() => Date.now());
  const failedSources = listFailedSources(lastRuns, t('scan.mac'));
  const showDetails = (): void => {
    openActionSheet({
      title: t('scan.title'),
      subject: { kind: 'scan' },
      details: failedSources,
    });
  };
  const press = usePressGesture({ onLongPress: showDetails });
  return (
    <button
      type="button"
      {...press.handlers}
      onClick={showDetails}
      aria-label={t('scan.title')}
      className={composeClassName(
        'relative inline-flex items-center gap-2 min-h-11 px-2.5 rounded-full border border-line bg-surface text-caption text-ink-muted tabular-nums cursor-pointer',
        PRESSABLE_CLASS_NAME,
      )}
    >
      <RunAge icon="scan" report={lastRuns.scan} now={now} />
      <RunAge icon="laptop" report={lastRuns.macCollection} now={now} />
      {failedSources.length === 0 ? null : (
        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-danger text-on-bronze text-label">
          {failedSources.length}
        </span>
      )}
    </button>
  );
}

// @FollowsBlueprint organism-query-owning
export function ScanStatus({ lastRuns }: ScanStatusProps): JSX.Element {
  const { t } = useTranslation();
  const target = useClaudeCodeTarget();
  return (
    <div className="flex items-center gap-1">
      {lastRuns === null ? null : <LastRunsPill lastRuns={lastRuns} />}
      <a
        href={buildEnvironmentAddress(target.data, 'talos', t('scan.prompt'))}
        target="_blank"
        rel="noopener"
        aria-label={t('scan.open')}
        className={buttonVariants({ variant: 'quiet', size: 'icon' })}
      >
        <Icon name="scan" size={22} />
      </a>
    </div>
  );
}
