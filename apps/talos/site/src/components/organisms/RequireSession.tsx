import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet } from 'react-router-dom';
import { Spinner } from '../atoms/Spinner';
import { useSession } from '../../lib/queries/session.queries';
import { selectSessionGateState } from './session-gate.core';

function CheckingSession(): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <Spinner label={t('common.loading')} />
    </div>
  );
}

function RedirectToLogin(): JSX.Element {
  return <Navigate to="/login" replace />;
}

const VIEW_BY_GATE_STATE = {
  checking: CheckingSession,
  'sign-in-required': RedirectToLogin,
  granted: Outlet,
} as const;

// @FollowsBlueprint organism-query-owning
export function RequireSession(): JSX.Element {
  const session = useSession();
  const View =
    VIEW_BY_GATE_STATE[selectSessionGateState(session.isPending, session.data?.signedIn)];
  return <View />;
}
