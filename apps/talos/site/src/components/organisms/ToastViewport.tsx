import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Toast } from '../molecules/Toast';
import type { ToastAction } from '../../lib/toast.core';
import { dismissToast, useShownToast } from '../../lib/toast.hook';

function dismissingFirst(action: ToastAction): ToastAction {
  return {
    label: action.label,
    onAction: () => {
      dismissToast();
      action.onAction();
    },
  };
}

// @FollowsBlueprint organism-query-owning
export function ToastViewport(): JSX.Element {
  const { t } = useTranslation();
  const toast = useShownToast();
  return (
    <div
      aria-live="polite"
      className="fixed inset-x-0 z-50 px-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] pointer-events-none"
    >
      <div className="max-w-[560px] mx-auto pointer-events-auto">
        {toast === null ? null : (
          <Toast
            key={toast.id}
            tone={toast.tone}
            message={toast.message}
            action={toast.action === undefined ? undefined : dismissingFirst(toast.action)}
            closeLabel={t('toast.close')}
            onClose={dismissToast}
          />
        )}
      </div>
    </div>
  );
}
