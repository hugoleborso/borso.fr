import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { SectionTitle } from '../atoms/SectionTitle';
import { FocusItemCard } from '../molecules/FocusItemCard';
import { DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { useUpdateFocus } from '../../lib/queries/today.queries';
import { FocusEditor } from './FocusEditor';
import { type FocusItemShape, isHorizonPast } from './focus-editor.core';

export interface TodayFocusProps {
  readonly items: readonly FocusItemShape[];
  readonly today: string;
}

// @FollowsBlueprint organism-mutation-panel
export function TodayFocus({ items, today }: TodayFocusProps): JSX.Element {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const updateFocus = useUpdateFocus();

  return (
    <Card>
      <section>
        <SectionTitle
          trailing={
            isEditing ? null : (
              <Button
                variant="quiet"
                size="icon"
                aria-label={t('today.focus.edit')}
                onClick={() => setIsEditing(true)}
              >
                <Icon name="edit" size={18} />
              </Button>
            )
          }
        >
          {t('today.focus.title')}
        </SectionTitle>
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
                      { labelKey: 'common.edit', icon: 'edit', onSelect: () => setIsEditing(true) },
                    ],
                  });
                }}
              />
            ))}
          </ol>
        )}
      </section>
    </Card>
  );
}
