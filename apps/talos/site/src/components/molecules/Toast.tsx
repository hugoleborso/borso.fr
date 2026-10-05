import type { JSX } from 'react';
import { Button } from '../atoms/Button';
import { Icon, type IconName } from '../atoms/Icon';
import type { ToastTone } from '../../lib/toast.core';
import { toastIconVariants, toastVariants } from './toast.variants';

const TOAST_ICON: Readonly<Record<ToastTone, IconName>> = {
  neutral: 'info',
  success: 'success',
  info: 'info',
  danger: 'warning',
};

export interface ToastProps {
  readonly tone: ToastTone;
  readonly message: string;
  readonly closeLabel: string;
  readonly onClose: () => void;
}

// @FollowsBlueprint molecule-presentational
export function Toast({ tone, message, closeLabel, onClose }: ToastProps): JSX.Element {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={toastVariants({ tone })}>
      <Icon name={TOAST_ICON[tone]} size={18} className={toastIconVariants({ tone })} />
      <p className="m-0 flex-1 text-body-sm">{message}</p>
      <Button
        variant="quiet"
        size="sm"
        aria-label={closeLabel}
        className="min-w-9 px-0"
        onClick={onClose}
      >
        <Icon name="close" size={16} />
      </Button>
    </div>
  );
}
