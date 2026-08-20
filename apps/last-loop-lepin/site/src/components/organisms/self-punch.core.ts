import { ApiError } from '../../lib/api-error';
import type { RankedRunnerDto } from '../../lib/race.types';

export type SelfPunchStateKind =
  | 'confirm'
  | 'awaiting-geo'
  | 'success'
  | 'out-of-zone'
  | 'already-out'
  | 'permission-denied'
  | 'timeout'
  | 'business-error'
  | 'network-error';

export type SelfPunchBusinessReason =
  'race-not-started' | 'race-finished' | 'already-punched-this-loop' | 'runner-not-in-race';

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
 * @Blueprint core-client-state-machine
 * @BlueprintName Core Client State Machine
 * @BlueprintUsage Use for a front end flow with several named outcomes, so the component stores one state instead of a set of flags.
 * @BlueprintDescription One reducer over a union state and a union event, with a `default` arm calling `assertNever`, so a new event without a transition is a compile error rather than a blank dialog. The adapters beside it, `selectFailureEvent` and `selectRejectionEvent`, turn a rejected request into an event before it reaches the reducer, which keeps the transport out of the machine and leaves the whole file pure and covered.
 */
export function nextStep(_current: SelfPunchState, event: SelfPunchEvent): SelfPunchState {
  switch (event.type) {
    case 'open':
      return event.runner.status.kind === 'dnf' ? { kind: 'already-out' } : { kind: 'confirm' };
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

const BUSINESS_REASONS: readonly SelfPunchBusinessReason[] = [
  'race-not-started',
  'race-finished',
  'already-punched-this-loop',
  'runner-not-in-race',
];

const OUT_OF_ZONE_ERROR = 'out-of-zone';
const FIRST_LOOP_INDEX = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function selectTargetLoopIndex(runner: RankedRunnerDto): number {
  if (runner.status.kind !== 'in-race') return FIRST_LOOP_INDEX;
  return runner.status.lastLoop + FIRST_LOOP_INDEX;
}

export function readValidatedLoopIndex(body: unknown): number {
  if (!isRecord(body)) return 0;
  const punch = body.punch;
  if (!isRecord(punch)) return 0;
  const loopIndex = punch.loopIndex;
  if (typeof loopIndex !== 'number') return 0;
  return loopIndex;
}

export function selectRejectionEvent(body: unknown): SelfPunchEvent {
  const errorField = isRecord(body) ? body.error : undefined;
  if (errorField === OUT_OF_ZONE_ERROR) return { type: 'server-out-of-zone' };
  const reason = BUSINESS_REASONS.find((candidate) => candidate === errorField);
  return { type: 'server-business-error', reason: reason ?? 'runner-not-in-race' };
}

export function selectFailureEvent(error: unknown): SelfPunchEvent {
  if (error instanceof ApiError) return selectRejectionEvent(error.body);
  return { type: 'network-error' };
}
