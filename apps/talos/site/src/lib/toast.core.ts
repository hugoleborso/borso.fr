import type { ParseKeys } from 'i18next';

export type ToastTone = 'neutral' | 'success' | 'danger' | 'info';

export interface ToastContent {
  readonly tone: ToastTone;
  readonly message: string;
}

export interface TranslatableToast {
  readonly tone: ToastTone;
  readonly messageKey: ParseKeys;
}

const CONFIRMATION_DURATION_MS = 4000;

const TOAST_DURATION_MS: Readonly<Record<ToastTone, number | null>> = {
  neutral: CONFIRMATION_DURATION_MS,
  success: CONFIRMATION_DURATION_MS,
  info: CONFIRMATION_DURATION_MS,
  danger: null,
};

// @FollowsBlueprint core-view-intent
export function selectToastDuration(tone: ToastTone): number | null {
  return TOAST_DURATION_MS[tone];
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
