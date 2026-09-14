/** @Feature auth */

import type { InputHTMLAttributes, JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';

export interface PasswordFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type' | 'className'
> {
  readonly id: string;
}

// @FollowsBlueprint molecule-local-state
export function PasswordField({ id, ...rest }: PasswordFieldProps): JSX.Element {
  const { t } = useTranslation();
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  return (
    <div className="relative">
      <Input id={id} type={isRevealed ? 'text' : 'password'} className="pr-11" {...rest} />
      <button
        type="button"
        onClick={() => setIsRevealed((revealed) => !revealed)}
        aria-label={isRevealed ? t('auth.hidePassword') : t('auth.showPassword')}
        aria-pressed={isRevealed}
        aria-controls={id}
        className="absolute inset-y-0 right-0 w-11 min-h-11 flex items-center justify-center text-ink-400 hover:text-ink-700 bg-transparent border-0 cursor-pointer"
      >
        <Icon name={isRevealed ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </div>
  );
}
