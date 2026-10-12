import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { composeClassName } from '../atoms/class-name.utils';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';
import { selectPageLabel } from '../../lib/wikilinks.core';
import { CommitmentWithSources } from './CommitmentWithSources';

export interface CommitmentDetailProps {
  readonly path: string;
}

// @FollowsBlueprint organism-query-owning
export function CommitmentDetail({ path }: CommitmentDetailProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const press = usePressGesture({
    onLongPress: () => {
      openActionSheet({ title: selectPageLabel(path), subject: { kind: 'commitment', path } });
    },
  });
  return (
    <article className="pt-2 flex flex-col gap-4 pb-6">
      <div
        {...press.handlers}
        className={composeClassName('flex items-center gap-1 -ml-3', PRESSABLE_CLASS_NAME)}
      >
        <Button
          variant="quiet"
          size="icon"
          aria-label={t('brain.page.back')}
          onClick={() => void navigate(-1)}
        >
          <Icon name="back" size={22} />
        </Button>
        <p className="m-0 min-w-0 flex-1 text-xs font-mono text-ink-faint truncate">{path}</p>
      </div>
      <CommitmentWithSources path={path} />
    </article>
  );
}
