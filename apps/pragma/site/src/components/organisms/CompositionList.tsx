/** @Feature compositions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { CompositionRecord } from '../../lib/queries/compositions.queries';
import { Badge } from '../atoms/Badge';
import { Icon } from '../atoms/Icon';

export interface CompositionListProps {
  readonly compositions: readonly CompositionRecord[];
}

const ROW_CLASS =
  'flex min-h-11 items-center gap-3 rounded-md border border-rule bg-leaf px-3 py-2 text-ink ' +
  'no-underline transition-colors hover:border-rule-strong focus-visible:outline-3 focus-visible:outline-focus';

// @FollowsBlueprint organism-presentational
export function CompositionList({ compositions }: CompositionListProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label={t('compos.title')}>
      {compositions.map((composition) => (
        <li key={composition.id}>
          <Link to={`/compos/${composition.id}/sketch`} className={ROW_CLASS}>
            <span className="min-w-0 flex-1 truncate text-body">{composition.title}</span>
            {composition.songId === null ? null : (
              <Badge tone="accent">{t('compos.inCatalogue')}</Badge>
            )}
            <Icon name="compos" size="sm" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
