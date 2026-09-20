import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { readRejectionCode } from '@site/lib/rejection-code.core';
import { CreateGameForm } from '@site/components/organisms/CreateGameForm';
import { ErrorNote } from '@site/components/atoms/ErrorNote';
import { useCreateGame } from '@site/lib/queries/game.queries';

// @FollowsBlueprint route-form
export function CreateGamePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createGame = useCreateGame();
  const failure = createGame.error;

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black">{t('create.title')}</h1>
      <ErrorNote code={readRejectionCode(failure)} />
      <CreateGameForm
        submitting={createGame.isPending}
        onSubmit={(values) => {
          createGame.mutate(values, {
            onSuccess: (seated) => {
              void navigate(`/partie/${seated.game.joinCode}`);
            },
          });
        }}
      />
    </div>
  );
}
