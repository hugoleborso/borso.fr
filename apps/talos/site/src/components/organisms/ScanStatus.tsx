import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '../atoms/button.variants';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { detectClaudeCodeOpener } from '../../lib/claude-code-opener.adapter';
import {
  buildEnvironmentAddress,
  selectClaudeCodeLinkTarget,
} from '../../lib/claude-code-address.core';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';
import { useCopyPromptOnLaunch } from '../../lib/prompt-copy.hook';
import { useClaudeCodeTarget } from '../../lib/queries/messages.queries';
import { measureAge } from '../../lib/relative-age.utils';
import {
  type LastRunsShape,
  listFailedSources,
  isRunStale,
  type RunReportShape,
  selectAgeLabelKey,
} from './scan-status.core';

export interface ScanStatusProps {
  readonly lastRuns: LastRunsShape | null;
}

function useRunAgeLabel(): (report: RunReportShape | null, now: number) => string {
  const { t } = useTranslation();
  return (report, now) => {
    const age = report === null ? null : measureAge(report.at, now);
    return age === null ? t('age.never') : t(selectAgeLabelKey(age.unit), { count: age.value });
  };
}

function LastRunsPill({ lastRuns }: { readonly lastRuns: LastRunsShape }): JSX.Element {
  const { t } = useTranslation();
  const [now] = useState(() => Date.now());
  const ageLabel = useRunAgeLabel();
  const failedSources = listFailedSources(lastRuns, t('scan.mac'));
  const isStale = isRunStale(lastRuns.scan, now);
  const showDetails = (): void => {
    openActionSheet({
      title: t('scan.title'),
      subject: { kind: 'scan' },
      details: [
        t('scan.mac-age', { age: ageLabel(lastRuns.macCollection, now) }),
        ...failedSources,
      ],
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
        'relative inline-flex items-center gap-1.5 min-h-11 px-2.5 rounded-full border text-caption tabular-nums whitespace-nowrap cursor-pointer',
        isStale
          ? 'border-danger/30 bg-danger-soft text-danger font-semibold'
          : 'border-line bg-surface text-ink-muted',
        PRESSABLE_CLASS_NAME,
      )}
    >
      {lastRuns.scan === null
        ? t('scan.never')
        : t('scan.age', { age: ageLabel(lastRuns.scan, now) })}
      {failedSources.length === 0 ? null : (
        <span
          aria-label={t('scan.failed', { count: failedSources.length })}
          className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-danger text-on-bronze text-label"
        >
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
  const copyPrompt = useCopyPromptOnLaunch();
  const opener = detectClaudeCodeOpener();
  const prompt = t('scan.prompt');
  return (
    <div className="flex items-center gap-1">
      {lastRuns === null ? null : <LastRunsPill lastRuns={lastRuns} />}
      <a
        href={buildEnvironmentAddress(target.data, 'talos', prompt, opener)}
        target={selectClaudeCodeLinkTarget(opener)}
        rel="noopener"
        onClick={() => copyPrompt(prompt)}
        aria-label={t('scan.open')}
        className={buttonVariants({ variant: 'quiet', size: 'icon' })}
      >
        <Icon name="scan" size={22} />
      </a>
    </div>
  );
}
