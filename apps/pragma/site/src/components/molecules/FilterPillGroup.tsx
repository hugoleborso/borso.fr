import { Chip } from '../atoms/Chip';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';

export interface FilterPillOption<TValue extends string> {
  value: TValue;
  label: string;
  icon: IconName;
  count: number;
}

export interface FilterPillGroupProps<TValue extends string> {
  options: readonly FilterPillOption<TValue>[];
  value: TValue;
  onChange: (next: TValue) => void;
  className?: string;
}

// @FollowsBlueprint molecule-presentational
export function FilterPillGroup<TValue extends string>({
  options,
  value,
  onChange,
  className,
}: FilterPillGroupProps<TValue>): JSX.Element {
  return (
    <div
      className={composeClassName(
        'flex flex-nowrap sm:flex-wrap w-full sm:w-auto max-w-full overflow-x-auto sm:overflow-visible [scrollbar-width:none] gap-2',
        className,
      )}
      role="group"
    >
      {options.map((option) => (
        <Chip
          key={option.value}
          pressed={option.value === value}
          onPress={() => onChange(option.value)}
          className="shrink-0"
        >
          <Icon name={option.icon} />
          <span>{option.label}</span>
          <span className="tabular-nums">{option.count}</span>
        </Chip>
      ))}
    </div>
  );
}
