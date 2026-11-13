import { useTranslation } from 'react-i18next';
import { Select } from '@/components/atoms/Select';
import { setNewCardsPerDay } from '@/state/appState';
import { listNewCardsPerDayChoices, toNewCardsPerDay } from '@/state/persistedState.utils';

interface NewCardsPerDaySelectProps {
  newCardsPerDay: number;
}

// @FollowsBlueprint molecule-presentational
export function NewCardsPerDaySelect({ newCardsPerDay }: NewCardsPerDaySelectProps) {
  const { t } = useTranslation();
  const label = t('decks.new-cards-per-day.label');
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="font-bold">{label}</span>
      <Select
        value={String(newCardsPerDay)}
        ariaLabel={label}
        options={listNewCardsPerDayChoices().map((count) => ({
          value: String(count),
          label: String(count),
        }))}
        onSelect={(value) => setNewCardsPerDay(toNewCardsPerDay(value, newCardsPerDay))}
      />
    </div>
  );
}
