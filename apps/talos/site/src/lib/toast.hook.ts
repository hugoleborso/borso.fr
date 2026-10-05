import type { ParseKeys } from 'i18next';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import {
  buildFailureToast,
  selectToastDuration,
  type ToastContent,
  type TranslatableToast,
} from './toast.core';

export interface ShownToast extends ToastContent {
  readonly id: number;
}

interface ToastStore {
  shownToast: ShownToast | null;
  nextToastId: number;
  dismissTimer: ReturnType<typeof setTimeout> | undefined;
}

const toastStore: ToastStore = { shownToast: null, nextToastId: 1, dismissTimer: undefined };
const toastListeners = new Set<() => void>();

function publishToast(next: ShownToast | null): void {
  toastStore.shownToast = next;
  for (const listener of toastListeners) listener();
}

export function dismissToast(): void {
  clearTimeout(toastStore.dismissTimer);
  publishToast(null);
}

export function showToast(content: ToastContent): void {
  clearTimeout(toastStore.dismissTimer);
  publishToast({ ...content, id: toastStore.nextToastId });
  toastStore.nextToastId += 1;
  const duration = selectToastDuration(content.tone);
  if (duration !== null) toastStore.dismissTimer = setTimeout(dismissToast, duration);
}

function subscribeToToasts(onStoreChange: () => void): () => void {
  toastListeners.add(onStoreChange);
  return () => {
    toastListeners.delete(onStoreChange);
  };
}

function readShownToast(): ShownToast | null {
  return toastStore.shownToast;
}

// @FollowsBlueprint hook-external-store
export function useShownToast(): ShownToast | null {
  return useSyncExternalStore(subscribeToToasts, readShownToast, readShownToast);
}

export interface MutationToasts {
  readonly confirm: (toast: TranslatableToast) => void;
  readonly fail: (failure: unknown, fallbackKey: ParseKeys) => void;
}

export function useMutationToasts(): MutationToasts {
  const { t } = useTranslation();
  return {
    confirm: (toast) => {
      showToast({ tone: toast.tone, message: t(toast.messageKey) });
    },
    fail: (failure, fallbackKey) => {
      showToast(buildFailureToast(failure, t(fallbackKey)));
    },
  };
}
