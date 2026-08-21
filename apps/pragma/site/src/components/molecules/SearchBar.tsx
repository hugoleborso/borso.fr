import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';

export interface SearchBarProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}

// @FollowsBlueprint molecule-presentational
export function SearchBar({
  value,
  onChange,
  placeholder,
  className,
}: SearchBarProps): JSX.Element {
  return (
    <div className={composeClassName('relative flex-1 max-w-[380px] min-w-[260px]', className)}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
        <Icon name="search" />
      </span>
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
