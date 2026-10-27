/** @Feature songs */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '../atoms/IconButton';
import { SongEmbed } from '../molecules/SongEmbed';
import { resolveEmbed } from '../../lib/embed.utils';

export interface SongExternalLinkValue {
  readonly url: string;
  readonly provider: 'spotify' | 'deezer' | 'youtube' | 'other';
  readonly comment: string;
}

interface SongExternalLinksProps {
  readonly links: readonly SongExternalLinkValue[];
  readonly onRemove: (index: number) => void;
}

// @FollowsBlueprint organism-presentational
export function SongExternalLinks({ links, onRemove }: SongExternalLinksProps): JSX.Element | null {
  const { t } = useTranslation();
  const embeds = useMemo(
    () => links.map((link) => ({ link, embed: resolveEmbed(link.url) })),
    [links],
  );
  if (embeds.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2 mt-3">
      {embeds.map(({ link, embed }, index) => (
        <li
          key={link.url}
          className="relative bg-paper border border-rule rounded-md p-2 flex items-start gap-2"
        >
          <div className="flex-1 min-w-0">
            <SongEmbed embed={embed} title={`${link.provider}-${link.url}`} />
          </div>
          <IconButton
            icon="trash"
            variant="danger"
            label={t('common.delete')}
            onClick={() => onRemove(index)}
          />
        </li>
      ))}
    </ul>
  );
}
