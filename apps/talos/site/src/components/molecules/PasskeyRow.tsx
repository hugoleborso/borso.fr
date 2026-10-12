import type { JSX } from 'react';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';

export interface PasskeyRowProps {
  readonly title: string;
  readonly addedOnLabel: string;
  readonly removeLabel: string;
  readonly isRemovable: boolean;
  readonly onRemove: () => void;
}

// @FollowsBlueprint molecule-presentational
export function PasskeyRow({
  title,
  addedOnLabel,
  removeLabel,
  isRemovable,
  onRemove,
}: PasskeyRowProps): JSX.Element {
  return (
    <li className="flex items-center gap-3 min-h-14 border-b border-line last:border-b-0">
      <Icon name="passkey" size={20} className="text-patina" />
      <div className="min-w-0 flex-1 py-2">
        <p className="m-0 text-body-sm font-semibold text-ink">{title}</p>
        <p className="m-0 text-caption text-ink-muted">{addedOnLabel}</p>
      </div>
      {isRemovable ? (
        <Button variant="quiet" size="icon" aria-label={removeLabel} onClick={onRemove}>
          <Icon name="remove" size={18} />
        </Button>
      ) : null}
    </li>
  );
}
