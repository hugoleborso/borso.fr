import { type Key, ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import { chipVariants } from '../atoms/chip.variants';
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

const PILL_CLASS = composeClassName(chipVariants({ tone: 'choice', size: 'md' }), 'shrink-0');

// @FollowsBlueprint molecule-presentational
export function FilterPillGroup<TValue extends string>({
  options,
  value,
  onChange,
  className,
}: FilterPillGroupProps<TValue>): JSX.Element {
  const choose = (keys: ReadonlySet<Key>): void => {
    const chosen = options.find((option) => keys.has(option.value));
    if (chosen !== undefined) onChange(chosen.value);
  };
  return (
    <ToggleButtonGroup
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={choose}
      className={composeClassName(
        'flex flex-nowrap sm:flex-wrap w-full sm:w-auto max-w-full overflow-x-auto sm:overflow-visible [scrollbar-width:none] gap-2',
        className,
      )}
    >
      {options.map((option) => (
        <ToggleButton key={option.value} id={option.value} className={PILL_CLASS}>
          <Icon name={option.icon} />
          <span>{option.label}</span>
          <span className="tabular-nums">{option.count}</span>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
