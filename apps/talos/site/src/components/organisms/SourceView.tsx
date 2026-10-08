import type { JSX } from 'react';
import { useState } from 'react';
import { Icon } from '../atoms/Icon';
import { SourceRow } from '../molecules/SourceRow';
import { EmbeddedPage } from './EmbeddedPage';
import { classifySource } from './source-reference.core';

export interface SourceViewProps {
  readonly source: string;
  readonly isInitiallyOpen: boolean;
}

// @FollowsBlueprint organism-query-owning
export function SourceView({ source, isInitiallyOpen }: SourceViewProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(isInitiallyOpen);
  const reference = classifySource(source);
  if (reference.kind === 'link') {
    return (
      <SourceRow icon="external" href={reference.href}>
        {reference.href}
      </SourceRow>
    );
  }
  if (reference.kind === 'text') return <SourceRow icon="mail">{reference.text}</SourceRow>;
  return (
    <details
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className="group"
    >
      <summary className="flex items-center gap-2 min-h-11 px-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <Icon name="source" size={18} className="text-ink-muted" />
        <span className="min-w-0 flex-1 font-mono text-mono-sm text-ink-soft truncate">
          {reference.path}
        </span>
        <Icon
          name="chevron"
          size={18}
          className="text-ink-faint transition-transform group-open:rotate-90"
        />
      </summary>
      {isOpen ? (
        <div className="px-3 pb-3">
          <EmbeddedPage path={reference.path} />
        </div>
      ) : null}
    </details>
  );
}
