import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { selectLabel } from '../../lib/label.utils';
import { listWhen } from '../../lib/optional.utils';
import { useTransitionEditionStatus } from '../../lib/queries/editions';
import type { RaceEditionDto } from '../../lib/race.types';
import { Button } from '../atoms/Button';
import { ErrorText } from '../atoms/ErrorText';
import { Show } from '../atoms/Show';
import { type AdminErrorMessage, selectEditionWriteError } from './admin-errors.core';

interface FinishRacePromptProps {
  readonly edition: RaceEditionDto;
  readonly totalRunners: number;
}

/**
 * Banner offering to close the race once every bib is out. Freezing the
 * standings is irreversible from this screen, so the operator confirms first.
 */
export function FinishRacePrompt({ edition, totalRunners }: FinishRacePromptProps) {
  const { t } = useTranslation();
  const [failure, setFailure] = useState<AdminErrorMessage | null>(null);
  const transition = useTransitionEditionStatus();

  function finishRace(): void {
    const isConfirmed = globalThis.confirm(t('admin.finish.confirm', { runners: totalRunners }));
    setFailure(null);
    for (const slug of listWhen(isConfirmed, edition.slug)) {
      transition.mutate(
        { slug, status: 'finished' },
        {
          onError: (error: unknown) => {
            setFailure(selectEditionWriteError(error));
          },
        },
      );
    }
  }

  return (
    <div className="admin-finish-banner">
      <div className="admin-finish-banner__msg">
        <strong>{t('admin.finish.title')}</strong>
        <small>{t('admin.finish.detail', { count: totalRunners })}</small>
        <Show when={failure !== null}>
          <ErrorText>{t(failure?.key ?? 'common.error-detail', failure?.parameters)}</ErrorText>
        </Show>
      </div>
      <Button variant="primary" onClick={finishRace} disabled={transition.isPending}>
        {t(selectLabel(transition.isPending, 'admin.finish.pending', 'admin.finish.action'))}
      </Button>
    </div>
  );
}
