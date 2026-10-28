/** @Feature practice-mode */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { BackLink } from '../molecules/BackLink';
import { Menu } from '../molecules/Menu';

const LINE_SEPARATOR = ' · ';

export interface PracticeHeaderProps {
  readonly sessionPath: string;
  readonly sessionLabel: string;
  readonly number: number;
  readonly count: number;
  readonly setlistName: string | null;
  readonly onEnd: () => void;
  readonly onOpenSetlist: () => void;
  readonly onOpenSongList: () => void;
}

// @FollowsBlueprint organism-presentational
export function PracticeHeader(props: PracticeHeaderProps): JSX.Element {
  const { t } = useTranslation();
  const positionLine = [
    t('practice.position', { number: props.number, count: props.count }),
    props.setlistName,
  ]
    .filter((part) => part !== null)
    .join(LINE_SEPARATOR);
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <BackLink to={props.sessionPath} label={props.sessionLabel} />
        <Menu
          label={t('practice.actions')}
          items={[
            { label: t('practice.end'), icon: 'check', tone: 'default', onSelect: props.onEnd },
            {
              label: t('home.openSetlist'),
              icon: 'setlist',
              tone: 'default',
              onSelect: props.onOpenSetlist,
            },
          ]}
        />
      </div>
      <Button
        variant="quiet"
        size="sm"
        icon="setlist"
        className="self-start"
        onClick={props.onOpenSongList}
      >
        {positionLine}
      </Button>
    </>
  );
}
