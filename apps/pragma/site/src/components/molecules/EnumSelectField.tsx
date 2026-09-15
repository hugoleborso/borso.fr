/** @Feature songs */

import type { JSX } from 'react';
import { inputVariants } from '../atoms/input.variants';

export interface EnumSelectFieldProps<Value extends string> {
  readonly id: string;
  readonly label: string;
  readonly labelClassName: string;
  readonly value: Value;
  readonly options: readonly Value[];
  readonly labelOf: (option: Value) => string;
  readonly onChange: (value: Value) => void;
  readonly onBlur: () => void;
}

// @FollowsBlueprint molecule-presentational
export function EnumSelectField<Value extends string>({
  id,
  label,
  labelClassName,
  value,
  options,
  labelOf,
  onChange,
  onBlur,
}: EnumSelectFieldProps<Value>): JSX.Element {
  return (
    <>
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const chosen = options.find((option) => option === event.target.value);
          if (chosen !== undefined) onChange(chosen);
        }}
        onBlur={onBlur}
        className={inputVariants({ size: 'md' })}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labelOf(option)}
          </option>
        ))}
      </select>
    </>
  );
}
