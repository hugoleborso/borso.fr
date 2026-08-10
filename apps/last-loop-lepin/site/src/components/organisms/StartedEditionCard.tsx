import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatElevationMetres,
  formatKilometres,
  formatTimeOfDay,
} from '../../lib/formatters.utils';
import { selectLabel } from '../../lib/label.utils';
import { listWhen } from '../../lib/optional.utils';
import { useTransitionEditionStatus } from '../../lib/queries/editions';
import type { RaceEditionDto } from '../../lib/race.types';
import { Button } from '../atoms/Button';
import { Card, CardBody } from '../atoms/Card';
import { ErrorText } from '../atoms/ErrorText';
import { Show } from '../atoms/Show';
import { CardHeader } from '../molecules/CardHeader';
import { type AdminErrorMessage, selectEditionWriteError } from './admin-errors.core';
import { type EditionStatusTransition, selectNextTransition } from './edition-form.core';

const ACTIONS_STYLE = { gap: 'var(--d-2)', flexWrap: 'wrap' } as const;

const TITLE_KEY_BY_STATUS = {
  setup: 'admin.setup.current-edition-title',
  live: 'admin.setup.current-edition-title',
  finished: 'admin.setup.previous-edition-title',
} as const;

const CONFIRM_KEY_BY_TRANSITION = {
  setup: 'admin.setup.confirm-setup',
  live: 'admin.setup.confirm-live',
  finished: 'admin.setup.confirm-finished',
} as const;

const ACTION_KEY_BY_TRANSITION = {
  setup: 'admin.setup.reopen',
  live: 'admin.setup.start-race',
  finished: 'admin.setup.finish-race',
} as const;

const TITLE_ATTRIBUTE_KEY_BY_TRANSITION = {
  setup: 'admin.setup.reopen-hint',
  live: 'admin.setup.start-race-hint',
  finished: 'admin.setup.reopen-hint',
} as const;

interface StartedEditionCardProps {
  readonly edition: RaceEditionDto;
  readonly locale: string;
}

/**
 * Read only summary of the edition that has started or finished, with the one
 * status button that fits it: a live race ends, a finished race reopens.
 */
export function StartedEditionCard({ edition, locale }: StartedEditionCardProps) {
  const { t } = useTranslation();
  const [failure, setFailure] = useState<AdminErrorMessage | null>(null);
  const transition = useTransitionEditionStatus();
  const nextStatus: EditionStatusTransition = selectNextTransition(edition);

  function applyTransition(): void {
    const isConfirmed = globalThis.confirm(t(CONFIRM_KEY_BY_TRANSITION[nextStatus]));
    setFailure(null);
    for (const slug of listWhen(isConfirmed, edition.slug)) {
      transition.mutate(
        { slug, status: nextStatus },
        {
          onError: (error: unknown) => {
            setFailure(selectEditionWriteError(error));
          },
        },
      );
    }
  }

  return (
    <Card>
      <CardHeader
        title={t(TITLE_KEY_BY_STATUS[edition.status])}
        hint={
          <span className="muted mono">
            {t('admin.setup.edition-summary', {
              name: edition.displayName,
              status: edition.status,
            })}
          </span>
        }
      />
      <CardBody modifier="col">
        <div className="muted mono">
          {t('admin.setup.distance-line', {
            distance: t('common.distance', {
              kilometres: formatKilometres(edition.gpx.distanceMeters),
            }),
            elevation: t('common.elevation-gain', {
              metres: formatElevationMetres(edition.gpx.elevationGainMeters),
            }),
          })}
        </div>
        <div className="muted mono">
          {t('admin.setup.sun-line', {
            sunrise: formatTimeOfDay(new Date(edition.sunriseAt), locale),
            sunset: formatTimeOfDay(new Date(edition.sunsetAt), locale),
          })}
        </div>
        <Show when={failure !== null}>
          <ErrorText>{t(failure?.key ?? 'common.error-detail', failure?.parameters)}</ErrorText>
        </Show>
        <div className="row" style={ACTIONS_STYLE}>
          <Button
            variant="primary"
            onClick={applyTransition}
            disabled={transition.isPending}
            title={t(TITLE_ATTRIBUTE_KEY_BY_TRANSITION[nextStatus])}
          >
            {t(
              selectLabel(
                transition.isPending,
                'admin.setup.updating',
                ACTION_KEY_BY_TRANSITION[nextStatus],
              ),
            )}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
