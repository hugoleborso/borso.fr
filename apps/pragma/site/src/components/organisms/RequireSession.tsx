/**
 * Auth guard. Renders `<Outlet />` once the gated probe succeeds and
 * redirects to /login otherwise. The probe is a cheap GET on the gated
 * `/api/instruments` endpoint via `useSessionProbe()` — the API does
 * not (yet) expose `/api/auth/me`.
 *
 * A browser that has never signed in carries no session marker, so the
 * probe stays disabled and the visitor reaches /login without a gated
 * request answering 401.
 */

import type { JSX } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSessionProbe } from '../../lib/queries/auth';
import { hasSessionMarker } from '../../lib/session-marker';
import { selectSessionGateState, type SessionGateState } from './session-gate.core';

function CheckingSession(): JSX.Element {
  return (
    <div className="h-screen w-full flex items-center justify-center text-ink-400 text-sm">…</div>
  );
}

export function RequireSession(): JSX.Element {
  const location = useLocation();
  const isSessionRemembered = hasSessionMarker();
  const probe = useSessionProbe(isSessionRemembered);
  const gateState: SessionGateState = selectSessionGateState(
    isSessionRemembered,
    probe.isPending,
    probe.data?.authenticated,
  );

  const VIEW_BY_GATE_STATE = {
    checking: CheckingSession,
    'sign-in-required': () => <Navigate to="/login" replace state={{ from: location.pathname }} />,
    granted: Outlet,
  } as const;

  const View = VIEW_BY_GATE_STATE[gateState];
  return <View />;
}
