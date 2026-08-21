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
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>{t('common.action.cancel')}</Button>
        <Button variant="primary" onClick={onConfirm} testId="self-punch-confirm">
          {t('self-punch.confirm-action')}
        </Button>
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

// @FollowsBlueprint component-lookup-table
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
 * @Blueprint organism-state-machine
 * @BlueprintName Organism Driven By A State Machine
 * @BlueprintUsage Use for a flow with several outcomes, where each step has to name why it happened rather than only whether it worked.
 * @BlueprintDescription Holds one `useState` over the union `SelfPunchState` and never writes it directly: every change goes through `nextStep`, the pure reducer in `self-punch.core.ts`, and a rejected request becomes an event through `selectFailureEvent` before it reaches the reducer. The state's `kind` then indexes `BODY_BY_STATE`, a frozen record of body components, so adding a state without a body is a type error and the shell contains no branch.
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
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-[6px]">
      <button
        type="button"
        className="absolute inset-0 p-0 bg-transparent border-0"
        aria-label={t('self-punch.dismiss')}
        onClick={onClose}
      />
      <div
        className="relative z-1 flex flex-col gap-4 w-full max-w-[420px] p-5 rounded-xl border border-line bg-bg-elev shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-label={t('self-punch.dialog-label')}
      >
        <div className="flex items-center gap-3">
          <RunnerAvatar runner={runner.runner} size={AVATAR_SIZE_PX} surface="modal" />
          <div className="flex flex-col gap-1 min-w-0">
            <strong>{runner.runner.displayName}</strong>
            <Show when={runner.runner.bib !== null}>
              <span className="font-mono tabular-nums text-ink-3">#{runner.runner.bib}</span>
            </Show>
            <a className="text-ink-3" href={composeRunnerPath(runner.runner.slug)}>
              {t('self-punch.profile-link')}
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-3">
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
