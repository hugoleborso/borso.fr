import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { composeClassName } from '../atoms/class-name.utils';
import { MarkdownContent } from '../atoms/MarkdownContent';
import { BackLink } from '../molecules/BackLink';
import { EmptyState } from '../molecules/EmptyState';
import { QueryState } from '../molecules/QueryState';
import { type ActionSheetContent, openActionSheet } from '../../lib/action-sheet.hook';
import { useInAppLinkClick } from '../../lib/in-app-link.hook';
import { renderMarkdownToSafeHtml } from '../../lib/markdown.utils';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';
import { selectHistoryEntryDisplay } from './history-board.core';

export interface HistoryEntryState {
  readonly heading: string;
  readonly markdown: string | undefined;
  readonly isPending: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
  readonly sheet: ActionSheetContent;
  readonly backTo: string;
}

export interface HistoryEntryProps {
  readonly entry: HistoryEntryState;
}

// @FollowsBlueprint organism-presentational
export function HistoryEntry({ entry }: HistoryEntryProps): JSX.Element {
  const { t } = useTranslation();
  const onLinkClick = useInAppLinkClick();
  const press = usePressGesture({ onLongPress: () => openActionSheet(entry.sheet) });
  const display = selectHistoryEntryDisplay(entry.markdown, entry.error);
  return (
    <article className="pb-4">
      <BackLink to={entry.backTo} label={t('common.back')} />
      <h1
        {...press.handlers}
        className={composeClassName(
          'm-0 mt-1 mb-4 font-display text-display text-ink first-letter:uppercase',
          PRESSABLE_CLASS_NAME,
        )}
      >
        {entry.heading}
      </h1>
      {display.isMissing ? <EmptyState icon="activity" label={t('history.not-found')} /> : null}
      {display.isWaiting ? (
        <QueryState isPending={entry.isPending} onRetry={entry.refetch} />
      ) : null}
      {entry.markdown === undefined ? null : (
        <Card padding="lg">
          <MarkdownContent html={renderMarkdownToSafeHtml(entry.markdown)} onClick={onLinkClick} />
        </Card>
      )}
    </article>
  );
}
