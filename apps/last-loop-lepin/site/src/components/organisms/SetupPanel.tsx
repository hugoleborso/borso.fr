import { listPresent } from '../../lib/optional.utils';
import type { RaceEditionDto } from '../../lib/race.types';
import { CreateEditionForm } from './CreateEditionForm';
import {
  selectCreateFormHintKey,
  selectCreateFormTitleKey,
  selectEditableEdition,
  selectStartedEdition,
} from './edition-form.core';
import { EditionEditForm } from './EditionEditForm';
import { StartedEditionCard } from './StartedEditionCard';

interface SetupPanelProps {
  readonly currentEdition: RaceEditionDto | null;
  readonly locale: string;
  readonly now: Date;
}

// @FollowsBlueprint organism-presentational
export function SetupPanel({ currentEdition, locale, now }: SetupPanelProps) {
  return (
    <>
      {listPresent(selectEditableEdition(currentEdition)).map((edition) => (
        <EditionEditForm key={edition.slug} edition={edition} />
      ))}
      <CreateEditionForm
        currentEdition={currentEdition}
        titleKey={selectCreateFormTitleKey(currentEdition)}
        hintKey={selectCreateFormHintKey(currentEdition)}
        now={now}
      />
      {listPresent(selectStartedEdition(currentEdition)).map((edition) => (
        <StartedEditionCard key={edition.slug} edition={edition} locale={locale} />
      ))}
    </>
  );
}
