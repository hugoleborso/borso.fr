/**
 * SearchBar — text input with a leading search icon. The prototype
 * builds this inline (an absolutely-positioned icon over a padded
 * input); the molecule wraps that composition once so the routes
 * don't repeat the same six-line snippet.
 */

import type { ChangeEvent } from 'react';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { cn } from '../atoms/cn.utils';

export interface SearchBarProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder,
  className,
}: SearchBarProps): JSX.Element {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(event.target.value);
  };
  return (
    <div className={cn('relative flex-1 max-w-[380px] min-w-[260px]', className)}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
        <Icon name="search" />
      </span>
      <Input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
