/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveEmbed } from '../../lib/embed.utils';
import type { SongRecord } from '../../lib/queries/songs.queries';
import { Card } from '../atoms/Card';
import { SongEmbed } from '../molecules/SongEmbed';

export interface SongLinksCardProps {
  readonly links: SongRecord['links'];
}

// @FollowsBlueprint organism-presentational
export function SongLinksCard({ links }: SongLinksCardProps): JSX.Element | null {
  const { t } = useTranslation();
  if (links.length === 0) return null;
  return (
    <Card>
      <div className="text-xs tracking-wider uppercase text-ink-400 font-medium mb-2.5">
        {t('catalog.linksTitle')}
      </div>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li
            key={link.url}
            className="bg-bg border border-line rounded-md p-2 flex items-start gap-2"
          >
            <div className="flex-1 min-w-0">
              <SongEmbed embed={resolveEmbed(link.url)} title={`${link.provider}-${link.url}`} />
              {link.comment.length > 0 ? (
                <div className="text-xs text-ink-500 mt-1">{link.comment}</div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
