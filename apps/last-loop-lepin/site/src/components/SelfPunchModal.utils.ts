/**
 * State machine for the self-punch modale. Pure: no side effects, no React,
 * no `navigator`. The React shell (`SelfPunchModal.tsx`) wires events into
 * `nextStep` and renders the current state.
 *
 * 9 states, enumerated and exhaustively tested. The reducer's `default` is
 * an `assertNever` so a missed event becomes a compile error rather than
 * silently landing on a blank screen.
 */

import type { RankedRunnerDto } from '../domain/types';

export type SelfPunchStateKind =
  | 'confirm'
  | 'awaiting-geo'
  | 'success'
  | 'out-of-zone'
  | 'dnf'
  | 'permission-denied'
  | 'timeout'
  | 'business-error'
  | 'network-error';

export type SelfPunchBusinessReason =
  | 'race-not-started'
  | 'race-finished'
  | 'already-punched-this-loop'
  | 'runner-not-in-race';

export interface SelfPunchState {
  readonly kind: SelfPunchStateKind;
  readonly distanceMeters?: number;
  readonly validatedLoopIndex?: number;
  readonly businessReason?: SelfPunchBusinessReason;
}

export type SelfPunchEvent =
  | { readonly type: 'open'; readonly runner: RankedRunnerDto }
  | { readonly type: 'confirm-tap' }
  | { readonly type: 'geo-out-of-zone'; readonly distanceMeters: number }
  | { readonly type: 'geo-denied' }
  | { readonly type: 'geo-timeout' }
  | { readonly type: 'geo-unavailable' }
  | { readonly type: 'server-success'; readonly loopIndex: number }
  | { readonly type: 'server-out-of-zone' }
  | { readonly type: 'server-business-error'; readonly reason: SelfPunchBusinessReason }
  | { readonly type: 'network-error' }
  | { readonly type: 'retry' };

const INITIAL_STATE: SelfPunchState = { kind: 'confirm' };

function assertNever(value: never): never {
  throw new Error(`unhandled self-punch event: ${JSON.stringify(value)}`);
}

/**
 * Decide the modale's next state after `event`. `_current` is the state
 * that was visible just before the event; the FSM is deterministic on the
 * event alone (every transition fully replaces the state object), so the
 * parameter is kept for call-site clarity and signature symmetry with
 * `useReducer`-style reducers, but isn't consulted internally.
 *
 * Note: the `open` event always returns to `confirm` for an in-race runner,
 * or directly to `dnf` for an eliminated one — sidestepping the geoloc
 * dance entirely (spec Q.O.D. Q10, plan Q10 self-check).
 */
export function nextStep(_current: SelfPunchState, event: SelfPunchEvent): SelfPunchState {
  switch (event.type) {
    case 'open':
      return event.runner.status.kind === 'dnf' ? { kind: 'dnf' } : { kind: 'confirm' };
    case 'confirm-tap':
      return { kind: 'awaiting-geo' };
    case 'geo-out-of-zone':
      return { kind: 'out-of-zone', distanceMeters: event.distanceMeters };
    case 'geo-denied':
      return { kind: 'permission-denied' };
    case 'geo-timeout':
      return { kind: 'timeout' };
    case 'geo-unavailable':
      return { kind: 'permission-denied' };
    case 'server-success':
      return { kind: 'success', validatedLoopIndex: event.loopIndex };
    case 'server-out-of-zone':
      return { kind: 'out-of-zone' };
    case 'server-business-error':
      return { kind: 'business-error', businessReason: event.reason };
    case 'network-error':
      return { kind: 'network-error' };
    case 'retry':
      return INITIAL_STATE;
    default:
      return assertNever(event);
  }
}

export const initialSelfPunchState: SelfPunchState = INITIAL_STATE;
