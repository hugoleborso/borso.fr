import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { FocusItemCard } from '../molecules/FocusItemCard';
import { DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { useUpdateFocus } from '../../lib/queries/today.queries';
import { FocusEditor } from './FocusEditor';
import { type FocusItemShape, isHorizonPast, summarizeFocus } from './focus-editor.core';

export interface TodayFocusProps {
  readonly items: readonly FocusItemShape[];
  readonly today: string;
}

// @FollowsBlueprint organism-mutation-panel
export function TodayFocus({ items, today }: TodayFocusProps): JSX.Element {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const updateFocus = useUpdateFocus();

  const summary = summarizeFocus(items);
  return (
    <Card padding="none">
      <details
        className="group"
        open={isOpen || isEditing}
        onToggle={(event) => setIsOpen(event.currentTarget.open)}
      >
        <summary className="flex items-center gap-2 min-h-12 px-4 cursor-pointer list-none">
          <Icon name="sparkles" size={16} className="shrink-0 text-ink-muted" />
          <span className="text-label text-ink-muted">{t('today.focus.title')}</span>
          <span className="min-w-0 flex-1 truncate text-body-sm text-ink group-open:invisible">
            {summary.firstTitle}
          </span>
          {summary.moreCount === null ? null : (
            <span className="text-caption text-ink-muted tabular-nums group-open:invisible">
              {t('today.focus.more', { count: summary.moreCount })}
            </span>
          )}
          <Icon
            name="chevron"
            size={16}
            className="shrink-0 text-ink-muted transition-transform group-open:rotate-90"
          />
        </summary>
        <div className="px-4 pb-3">
          <div className="flex justify-end -mt-1">
            {isEditing ? null : (
              <Button
                variant="quiet"
                size="icon"
                aria-label={t('today.focus.edit')}
                onClick={() => setIsEditing(true)}
              >
                <Icon name="edit" size={18} />
              </Button>
            )}
          </div>
          {isEditing ? (
            <FocusEditor
              items={items}
              onCancel={() => setIsEditing(false)}
              onSave={(nextItems) => {
                setIsEditing(false);
                updateFocus.mutate({ items: nextItems });
              }}
            />
          ) : (
            <ol className="m-0 p-0 list-none">
              {items.map((item, index) => (
                <FocusItemCard
                  key={item.title}
                  rank={index + 1}
                  title={item.title}
                  why={item.why}
                  horizonLabel={
                    item.horizon === undefined
                      ? undefined
                      : formatShortDay(item.horizon, DISPLAY_LOCALE)
                  }
                  isHorizonPast={isHorizonPast(item.horizon ?? today, today)}
                  onLongPress={() => {
                    openActionSheet({
                      title: item.title,
                      subject: { kind: 'focus' },
                      actions: [
                        {
                          labelKey: 'common.edit',
                          icon: 'edit',
                          onSelect: () => setIsEditing(true),
                        },
                      ],
                    });
                  }}
                />
              ))}
            </ol>
          )}
        </div>
      </details>
    </Card>
  );
}
