import type { JSX } from 'react';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';

export interface RevokeDecisionButtonProps {
  readonly label: string;
  readonly isDisabled: boolean;
  readonly onRevoke: () => void;
}

// @FollowsBlueprint molecule-presentational
export function RevokeDecisionButton({
  label,
  isDisabled,
  onRevoke,
}: RevokeDecisionButtonProps): JSX.Element {
  return (
    <Button variant="quiet" size="sm" disabled={isDisabled} onClick={onRevoke}>
      <Icon name="undo" size={16} />
      {label}
    </Button>
  );
}
