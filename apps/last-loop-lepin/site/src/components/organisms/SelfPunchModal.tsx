import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelfPunch } from '../../lib/queries/punches';
import type { RankedRunnerDto } from '../../lib/race.types';
import { Button } from '../atoms/Button';
import { Show } from '../atoms/Show';
import { composeRunnerPath } from '../../routes/route.core';
import { RunnerAvatar } from '../molecules/RunnerAvatar';
import {
  initialSelfPunchState,
  nextStep,
  readValidatedLoopIndex,
  selectFailureEvent,
  selectTargetLoopIndex,
  type SelfPunchState,
  type SelfPunchStateKind,
} from './self-punch.core';

const AVATAR_SIZE_PX = 64;

interface SelfPunchModalProps {
  readonly runner: RankedRunnerDto;
  readonly editionSlug: string;
  readonly onClose: () => void;
}

interface BodyProps {
  readonly runner: RankedRunnerDto;
  readonly state: SelfPunchState;
  readonly onConfirm: () => void;
  readonly onRetry: () => void;
  readonly onClose: () => void;
}

function ConfirmBody({ runner, onConfirm, onClose }: BodyProps) {
  const { t } = useTranslation();
  return (
    <>
      <p>
        {t('self-punch.confirm-question', {
          name: runner.runner.displayName,
          loop: selectTargetLoopIndex(runner),
        })}
      </p>
      <div className="self-punch-modal__actions">
        <Button onClick={onClose}>{t('common.action.cancel')}</Button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onConfirm}
          data-testid="self-punch-confirm"
        >
          {t('self-punch.confirm-action')}
        </button>
      </div>
    </>
  );
}

function SendingBody() {
  const { t } = useTranslation();
  return <p>{t('self-punch.sending')}</p>;
}

function SuccessBody({ state, onClose }: BodyProps) {
  const { t } = useTranslation();
  return (
    <>
      <p>{t('self-punch.success', { loop: state.validatedLoopIndex ?? 0 })}</p>
      <Button variant="primary" onClick={onClose}>
        {t('common.action.close')}
      </Button>
    </>
  );
}

function AlreadyOutBody({ onClose }: BodyProps) {
  const { t } = useTranslation();
  return (
    <>
      <p>{t('self-punch.already-out')}</p>
      <Button onClick={onClose}>{t('common.action.close')}</Button>
    </>
  );
}

function InterruptedBody({ onClose }: BodyProps) {
  const { t } = useTranslation();
  return (
    <>
      <p>{t('self-punch.interrupted')}</p>
      <Button onClick={onClose}>{t('common.action.close')}</Button>
    </>
  );
}

const REJECTION_KEY_BY_REASON = {
  'race-not-started': 'self-punch.rejected.race-not-started',
  'race-finished': 'self-punch.rejected.race-finished',
  'already-punched-this-loop': 'self-punch.rejected.already-punched-this-loop',
  'runner-not-in-race': 'self-punch.rejected.runner-not-in-race',
} as const;

function RejectedBody({ state, onClose }: BodyProps) {
  const { t } = useTranslation();
  const reason = state.businessReason ?? 'runner-not-in-race';
  return (
    <>
      <p>{t(REJECTION_KEY_BY_REASON[reason])}</p>
      <Button onClick={onClose}>{t('common.action.close')}</Button>
    </>
  );
}

function NoConnectionBody({ onRetry }: BodyProps) {
  const { t } = useTranslation();
  return (
    <>
      <p>{t('self-punch.no-connection')}</p>
      <Button variant="primary" onClick={onRetry}>
        {t('common.action.retry')}
      </Button>
    </>
  );
}

const BODY_BY_STATE: Readonly<Record<SelfPunchStateKind, (props: BodyProps) => ReactNode>> = {
  confirm: ConfirmBody,
  'awaiting-geo': SendingBody,
  success: SuccessBody,
  'already-out': AlreadyOutBody,
  'out-of-zone': InterruptedBody,
  'permission-denied': InterruptedBody,
  timeout: InterruptedBody,
  'business-error': RejectedBody,
  'network-error': NoConnectionBody,
};

/**
 * Dialog a runner uses to confirm their own loop from their phone. The state
 * machine lives in `self-punch.core.ts`; this shell wires the mutation's
 * outcome into it and looks the matching body up in a table.
 *
 * The standings query polls every two seconds, so a confirmed punch needs no
 * refetch here to show up on the leaderboard.
 */
export function SelfPunchModal({ runner, editionSlug, onClose }: SelfPunchModalProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<SelfPunchState>(() =>
    nextStep(initialSelfPunchState, { type: 'open', runner }),
  );
  const selfPunch = useSelfPunch();

  function confirmPunch(): void {
    setState((current) => nextStep(current, { type: 'confirm-tap' }));
    selfPunch.mutate(
      {
        editionSlug,
        runnerSlug: runner.runner.slug,
        clientLat: null,
        clientLng: null,
        clientAccuracyM: null,
      },
      {
        onSuccess: (body: unknown) => {
          setState((current) =>
            nextStep(current, { type: 'server-success', loopIndex: readValidatedLoopIndex(body) }),
          );
        },
        onError: (error: unknown) => {
          setState((current) => nextStep(current, selectFailureEvent(error)));
        },
      },
    );
  }

  function retry(): void {
    setState((current) => nextStep(current, { type: 'retry' }));
  }

  const Body = BODY_BY_STATE[state.kind];

  return (
    <div className="self-punch-modal-backdrop">
      <button
        type="button"
        className="self-punch-modal-dismiss"
        aria-label={t('self-punch.dismiss')}
        onClick={onClose}
      />
      <div
        className="self-punch-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('self-punch.dialog-label')}
      >
        <div className="self-punch-modal__head">
          <RunnerAvatar runner={runner.runner} size={AVATAR_SIZE_PX} surface="modal" />
          <div className="self-punch-modal__head-text">
            <strong>{runner.runner.displayName}</strong>
            <Show when={runner.runner.bib !== null}>
              <span className="muted mono">#{runner.runner.bib}</span>
            </Show>
            <a className="muted" href={composeRunnerPath(runner.runner.slug)}>
              {t('self-punch.profile-link')}
            </a>
          </div>
        </div>
        <div className="self-punch-modal__body">
          <Body
            runner={runner}
            state={state}
            onConfirm={confirmPunch}
            onRetry={retry}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
