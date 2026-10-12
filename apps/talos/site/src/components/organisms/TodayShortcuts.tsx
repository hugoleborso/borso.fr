import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardTile } from '../molecules/DashboardTile';
import { openActionSheet } from '../../lib/action-sheet.hook';

export interface TodayShortcutsProps {
  readonly readyDraftCount: number;
  readonly reconnectCount: number;
}

// @FollowsBlueprint organism-presentational
export function TodayShortcuts({
  readyDraftCount,
  reconnectCount,
}: TodayShortcutsProps): JSX.Element {
  const { t } = useTranslation();
  const draftsLabel: string = t('today.shortcuts.drafts');
  const relationsLabel: string = t('today.shortcuts.relations');
  const historyLabel: string = t('today.shortcuts.history');
  return (
    <div className="grid grid-cols-3 gap-2">
      <DashboardTile
        to="/drafts"
        icon="draft"
        count={readyDraftCount}
        label={draftsLabel}
        isAlert={false}
        onLongPress={() => {
          openActionSheet({
            title: `${draftsLabel} · ${String(readyDraftCount)}`,
            subject: { kind: 'folder', path: 'etat/brouillons' },
          });
        }}
      />
      <DashboardTile
        to="/relations"
        icon="users"
        count={reconnectCount}
        label={relationsLabel}
        isAlert={false}
        onLongPress={() => {
          openActionSheet({
            title: `${relationsLabel} · ${String(reconnectCount)}`,
            subject: { kind: 'relations' },
          });
        }}
      />
      <DashboardTile
        to="/history"
        icon="activity"
        label={historyLabel}
        isAlert={false}
        onLongPress={() => {
          openActionSheet({
            title: historyLabel,
            subject: { kind: 'folder', path: 'journal' },
          });
        }}
      />
    </div>
  );
}
