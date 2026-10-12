import type { ParseKeys } from 'i18next';

export type ToastTone = 'neutral' | 'success' | 'danger' | 'info';

export interface ToastAction {
  readonly label: string;
  readonly onAction: () => void;
}

export interface ToastContent {
  readonly tone: ToastTone;
  readonly message: string;
  readonly action?: ToastAction;
}

export interface TranslatableToast {
  readonly tone: ToastTone;
  readonly messageKey: ParseKeys;
}

const CONFIRMATION_DURATION_MS = 4000;
const UNDOABLE_CONFIRMATION_DURATION_MS = 6000;

const TOAST_DURATION_MS: Readonly<Record<ToastTone, number | null>> = {
  neutral: CONFIRMATION_DURATION_MS,
  success: CONFIRMATION_DURATION_MS,
  info: CONFIRMATION_DURATION_MS,
  danger: null,
};

// @FollowsBlueprint core-view-intent
export function selectToastDuration(toast: Pick<ToastContent, 'tone' | 'action'>): number | null {
  const duration = TOAST_DURATION_MS[toast.tone];
  if (duration === null || toast.action === undefined) return duration;
  return UNDOABLE_CONFIRMATION_DURATION_MS;
}

function readServerMessage(failure: unknown): string | null {
  if (typeof failure !== 'object' || failure === null || !('body' in failure)) return null;
  const { body } = failure;
  if (typeof body !== 'object' || body === null || !('error' in body)) return null;
  return typeof body.error === 'string' && body.error.length > 0 ? body.error : null;
}

export function buildFailureToast(failure: unknown, fallbackMessage: string): ToastContent {
  return { tone: 'danger', message: readServerMessage(failure) ?? fallbackMessage };
}
