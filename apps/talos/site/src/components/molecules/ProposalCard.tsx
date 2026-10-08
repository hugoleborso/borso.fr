import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { Chip } from '../atoms/Chip';
import { composeClassName } from '../atoms/class-name.utils';
import type { ChipTone } from '../atoms/chip.variants';
import { Icon } from '../atoms/Icon';
import { MarkdownContent } from '../atoms/MarkdownContent';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface ProposalCardProps {
  readonly title: string;
  readonly categoryLabel: string;
  readonly priorityLabel: string;
  readonly priorityTone: ChipTone;
  readonly dateLabel: string;
  readonly whyHtml: string;
  readonly draft: string;
  readonly children: ReactNode;
  readonly onLongPress: () => void;
}

// @FollowsBlueprint molecule-presentational
export function ProposalCard({
  title,
  categoryLabel,
  priorityLabel,
  priorityTone,
  dateLabel,
  whyHtml,
  draft,
  children,
  onLongPress,
}: ProposalCardProps): JSX.Element {
  const { t } = useTranslation();
  const press = usePressGesture({ onLongPress });
  return (
    <Card>
      <article className="flex flex-col gap-3">
        <div
          {...press.handlers}
          className={composeClassName('flex flex-col gap-3', PRESSABLE_CLASS_NAME)}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip tone={priorityTone}>{priorityLabel}</Chip>
            <Chip tone="neutral">
              <Icon name="sparkles" size={13} />
              {categoryLabel}
            </Chip>
            <Chip tone="outline">
              <Icon name="calendar" size={13} />
              {dateLabel}
            </Chip>
          </div>
          <h2 className="m-0 text-heading text-ink">{title}</h2>
        </div>
        <section>
          <h3 className="m-0 mb-1 text-label text-ink-muted">{t('proposals.why')}</h3>
          <div className="text-body-sm [&_p]:my-0 [&_p+p]:mt-2">
            <MarkdownContent html={whyHtml} />
          </div>
        </section>
        <section>
          <h3 className="m-0 mb-1.5 text-label text-ink-muted">{t('proposals.draft')}</h3>
          <pre className="m-0 p-3 rounded-sm bg-sunk font-mono text-mono text-ink whitespace-pre-wrap break-words">
            {draft}
          </pre>
        </section>
        {children}
      </article>
    </Card>
  );
}
