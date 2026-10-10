import type { JSX, ReactNode } from 'react';
import { Chip } from '../atoms/Chip';
import type { ChipTone } from '../atoms/chip.variants';

export interface DecidedProposalRowProps {
  readonly title: string;
  readonly statusLabel: string;
  readonly statusTone: ChipTone;
  readonly decisions: readonly string[];
  readonly action?: ReactNode;
}

// @FollowsBlueprint molecule-presentational
export function DecidedProposalRow({
  title,
  statusLabel,
  statusTone,
  decisions,
  action,
}: DecidedProposalRowProps): JSX.Element {
  return (
    <li className="py-3 border-b border-line last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 text-body-sm text-ink">{title}</p>
        <Chip tone={statusTone}>{statusLabel}</Chip>
      </div>
      {decisions.map((decision) => (
        <p key={decision} className="m-0 mt-1 text-caption text-ink-muted">
          {decision}
        </p>
      ))}
      {action === undefined ? null : <div className="mt-1 -ml-3">{action}</div>}
    </li>
  );
}
