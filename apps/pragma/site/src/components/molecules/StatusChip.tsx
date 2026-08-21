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

/**
 * @Blueprint molecule-presentational
 * @BlueprintName Presentational Molecule
 * @BlueprintUsage Use for a molecule that renders what it is handed and decides nothing of its own.
 * @BlueprintDescription Indexes a frozen table of translation keys with the domain status and wraps one atom with the result, so the file holds no user facing string and no conditional. It owns no state and calls no query, and the status union is derived from the key table, so a status with no label cannot be rendered.
 */
export function StatusChip({ status }: StatusChipProps): JSX.Element {
  const { t } = useTranslation();
  return <Chip tone={status}>{t(STATUS_LABEL_KEY[status])}</Chip>;
}
