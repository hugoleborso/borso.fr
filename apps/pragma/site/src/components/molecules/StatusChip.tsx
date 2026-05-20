/**
 * StatusChip — the song's lifecycle marker, one of
 * `idea | wip | rehearsed | concert_ready`. Wraps the Chip atom
 * and picks the right tone + i18n label.
 */

import { useTranslation } from 'react-i18next';
import { Chip } from '../atoms/Chip';

const STATUS_LABEL_KEY = {
  idea: 'catalog.statusIdea',
  wip: 'catalog.statusWip',
  rehearsed: 'catalog.statusRehearsed',
  concert_ready: 'catalog.statusConcertReady',
} as const;

export type SongStatus = keyof typeof STATUS_LABEL_KEY;

export interface StatusChipProps {
  status: SongStatus;
}

export function StatusChip({ status }: StatusChipProps): JSX.Element {
  const { t } = useTranslation();
  return <Chip tone={status}>{t(STATUS_LABEL_KEY[status])}</Chip>;
}
