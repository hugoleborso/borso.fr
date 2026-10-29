/** @Feature auth */

import type { InputHTMLAttributes, JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '../atoms/IconButton';
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
      <IconButton
        icon={isRevealed ? 'eyeOff' : 'eye'}
        label={isRevealed ? t('auth.hidePassword') : t('auth.showPassword')}
        onClick={() => setIsRevealed((revealed) => !revealed)}
        aria-controls={id}
        className="absolute inset-y-0 right-0 h-full rounded-md"
      />
    </div>
  );
}
