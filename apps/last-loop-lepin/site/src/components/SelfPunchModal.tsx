import { useState, type ReactElement } from 'react';
import { ApiError, apiClient } from '../api/client';
import type { RankedRunnerDto } from '../domain/types';
import { RunnerAvatar } from './RunnerAvatar';
import {
  initialSelfPunchState,
  nextStep,
  type SelfPunchBusinessReason,
  type SelfPunchState,
} from './SelfPunchModal.utils';

const MODAL_AVATAR_PX = 64;

interface SelfPunchModalProps {
  readonly runner: RankedRunnerDto;
  readonly editionSlug: string;
  readonly onClose: () => void;
  readonly onPunchPersisted: () => void;
}

const BUSINESS_REASON_VALUES: readonly SelfPunchBusinessReason[] = [
  'race-not-started',
  'race-finished',
  'already-punched-this-loop',
  'runner-not-in-race',
];

function parseBusinessReason(raw: unknown): SelfPunchBusinessReason | null {
  if (typeof raw !== 'string') return null;
  const found = BUSINESS_REASON_VALUES.find((value) => value === raw);
  return found ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readErrorField(body: unknown): unknown {
  return isRecord(body) ? body.error : undefined;
}

function readLoopIndex(body: unknown): number {
  if (!isRecord(body)) return 0;
  const punch = body.punch;
  if (!isRecord(punch)) return 0;
  const loopIndex = punch.loopIndex;
  return typeof loopIndex === 'number' ? loopIndex : 0;
}

function formatBusinessMessage(reason: SelfPunchBusinessReason | undefined): string {
  switch (reason) {
    case 'race-not-started':
      return "La course n'est pas encore commencée.";
    case 'race-finished':
      return 'La course est terminée.';
    case 'already-punched-this-loop':
      return 'Tu as déjà été pointé pour cette boucle.';
    case 'runner-not-in-race':
      return "Tu n'es pas inscrit comme coureur dans cette édition.";
    case undefined:
      return 'Pointage refusé par le serveur.';
    default:
      return 'Pointage refusé par le serveur.';
  }
}

export function SelfPunchModal({
  runner,
  editionSlug,
  onClose,
  onPunchPersisted,
}: SelfPunchModalProps) {
  // Initial state is derived from the runner status (DNF → straight to the
  // error variant). Using a lazy initialiser keeps the FSM event log
  // self-consistent — the `open` transition runs once at mount.
  const [state, setState] = useState<SelfPunchState>(() =>
    nextStep(initialSelfPunchState, { type: 'open', runner }),
  );

  async function handleConfirmTap(): Promise<void> {
    setState((current) => nextStep(current, { type: 'confirm-tap' }));

    try {
      const body: unknown = await apiClient.selfPunch({
        editionSlug,
        runnerSlug: runner.runner.slug,
        clientLat: null,
        clientLng: null,
        clientAccuracyM: null,
      });
      const loopIndex = readLoopIndex(body);
      setState((current) => nextStep(current, { type: 'server-success', loopIndex }));
      onPunchPersisted();
      return;
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setState((current) => nextStep(current, { type: 'network-error' }));
        return;
      }
      const body: unknown = error.body;
      const errorField = readErrorField(body);
      if (errorField === 'out-of-zone') {
        setState((current) => nextStep(current, { type: 'server-out-of-zone' }));
        return;
      }
      const reason = parseBusinessReason(errorField);
      if (reason !== null) {
        setState((current) => nextStep(current, { type: 'server-business-error', reason }));
        return;
      }
      setState((current) =>
        nextStep(current, {
          type: 'server-business-error',
          reason: 'runner-not-in-race',
        }),
      );
    }
  }

  function handleRetry(): void {
    setState((current) => nextStep(current, { type: 'retry' }));
  }

  function renderBody(): ReactElement {
    switch (state.kind) {
      case 'confirm': {
        const targetLoop =
          runner.status.kind === 'in-race' ? runner.status.lastLoop + 1 : 1;
        return (
          <>
            <p>
              Je suis <strong>{runner.runner.displayName}</strong>, valider la boucle{' '}
              <strong>{targetLoop}</strong> ?
            </p>
            <div className="self-punch-modal__actions">
              <button type="button" className="btn" onClick={onClose}>
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  void handleConfirmTap();
                }}
                data-testid="self-punch-confirm"
              >
                Je suis là
              </button>
            </div>
          </>
        );
      }
      case 'awaiting-geo':
        return <p>Envoi en cours…</p>;
      case 'success':
        return (
          <>
            <p>
              Boucle <strong>{state.validatedLoopIndex ?? '?'}</strong> validée !
            </p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Fermer
            </button>
          </>
        );
      case 'dnf':
        return (
          <>
            <p>
              Ce coureur est déjà éliminé — adresse-toi à l'organisation si tu veux être
              réintégré.
            </p>
            <button type="button" className="btn" onClick={onClose}>
              Fermer
            </button>
          </>
        );
      case 'out-of-zone':
      case 'permission-denied':
      case 'timeout':
        return (
          <>
            <p>Pointage interrompu. Réessaie.</p>
            <button type="button" className="btn" onClick={onClose}>
              Fermer
            </button>
          </>
        );
      case 'business-error':
        return (
          <>
            <p>{formatBusinessMessage(state.businessReason)}</p>
            <button type="button" className="btn" onClick={onClose}>
              Fermer
            </button>
          </>
        );
      case 'network-error':
        return (
          <>
            <p>Pas de connexion. Réessaie.</p>
            <button type="button" className="btn btn-primary" onClick={handleRetry}>
              Réessayer
            </button>
          </>
        );
      default:
        return <p>État inconnu.</p>;
    }
  }

  // The backdrop is a `<button>` (a11y: needs keyboard parity with click,
  // and Esc closes natively via blur+keyboard sequences in most browsers).
  // Its `role="dialog"` is on the modal panel inside; the backdrop is the
  // dismissal affordance only.
  return (
    <div className="self-punch-modal-backdrop">
      <button
        type="button"
        className="self-punch-modal-dismiss"
        aria-label="Fermer la fenêtre"
        onClick={onClose}
      />
      <div
        className="self-punch-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Validation de boucle"
      >
        <div className="self-punch-modal__head">
          <RunnerAvatar
            runner={runner.runner}
            size={MODAL_AVATAR_PX}
            surface="modal"
          />
          <div className="self-punch-modal__head-text">
            <strong>{runner.runner.displayName}</strong>
            {runner.runner.bib === null ? null : (
              <span className="muted mono">#{runner.runner.bib}</span>
            )}
          </div>
        </div>
        <div className="self-punch-modal__body">{renderBody()}</div>
      </div>
    </div>
  );
}
