/** @Feature auth */

import { useIsRestoring, useQueryClient } from '@tanstack/react-query';
import { type AnimationEvent, type JSX, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSessionProbe } from '../../lib/queries/auth.queries';
import { hasSessionMarker } from '../../lib/session-marker.adapter';
import { useIsOnline } from '../molecules/online-status.hook';
import { OpeningScreen } from './OpeningScreen';
import { useOpeningWait } from './opening-wait.hook';
import {
  isOpeningExit,
  selectConnectionNote,
  selectOpeningOverlay,
  selectSessionGateState,
  type SessionGateState,
} from './session-gate.core';

type RouteGateState = Exclude<SessionGateState, 'sign-in-required'>;

const ROUTE_LOOK_BY_GATE_STATE = {
  opening: { isInert: true, className: 'contents invisible' },
  'opening-failed': { isInert: true, className: 'contents invisible' },
  granted: { isInert: false, className: 'contents' },
} as const satisfies Readonly<Record<RouteGateState, { isInert: boolean; className: string }>>;

function SignInRedirect(): JSX.Element {
  const location = useLocation();
  return (
    <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  );
}

interface GatedRouteProps {
  readonly gateState: RouteGateState;
}

function GatedRoute({ gateState }: GatedRouteProps): JSX.Element {
  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();
  const isOnline = useIsOnline();
  const [hasOpened, setHasOpened] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);
  const overlay = selectOpeningOverlay(gateState, isRestoring, hasOpened, hasLeft);
  const routeLook = ROUTE_LOOK_BY_GATE_STATE[gateState];

  function retryOpening(): void {
    void queryClient.refetchQueries({ type: 'active' });
  }

  function rememberOpened(): void {
    setHasOpened(true);
  }

  function rememberLeft(event: AnimationEvent<HTMLDivElement>): void {
    setHasLeft(isOpeningExit(event.animationName));
  }

  return (
    <>
      <div inert={routeLook.isInert} className={routeLook.className}>
        <Outlet />
      </div>
      {overlay === null ? null : (
        <OpeningScreen
          phase={overlay}
          connectionNote={selectConnectionNote(isOnline)}
          onRetry={retryOpening}
          onAnimationStart={rememberOpened}
          onAnimationEnd={rememberLeft}
        />
      )}
    </>
  );
}

/**
 * @Blueprint organism-query-owning
 * @BlueprintName Organism That Owns A Query
 * @BlueprintUsage Use for the lowest component allowed to call a query hook, where a screen region needs server data.
 * @BlueprintDescription Calls the query hook at the organism level rather than in a molecule, hands the marker, the probe's answer and the cache's opening wait to `selectSessionGateState` in a covered core file, and indexes a table of views with the union it returns, so the component body carries no branch. The probe stays disabled until the browser holds a session marker, so a first time visitor sends no gated request. The route keeps one element type across the opening states, so it mounts once beneath the opening screen and its reads join the probe's first batch.
 */
export function RequireSession(): JSX.Element {
  const isSessionRemembered = hasSessionMarker();
  const probe = useSessionProbe(isSessionRemembered);
  const openingWait = useOpeningWait();
  const gateState: SessionGateState = selectSessionGateState(
    isSessionRemembered,
    probe.data?.authenticated,
    openingWait,
  );

  const VIEW_BY_GATE_STATE = {
    'sign-in-required': <SignInRedirect />,
    opening: <GatedRoute gateState="opening" />,
    'opening-failed': <GatedRoute gateState="opening-failed" />,
    granted: <GatedRoute gateState="granted" />,
  } as const;

  return VIEW_BY_GATE_STATE[gateState];
}
