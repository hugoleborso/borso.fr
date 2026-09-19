import { MONKEY_AVATARS, type MonkeyAvatar, NICKNAME_MAX_LENGTH } from '@domain/monkey.core';
import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';
import { selectFreeAvatars } from '@domain/monkey.core';
import { ChunkyButton } from '../atoms/ChunkyButton';
import { FieldLabel } from '../atoms/FieldLabel';
import { MonkeyPicker } from '../molecules/MonkeyPicker';

export interface JoinGameValues {
  readonly nickname: string;
  readonly avatar: MonkeyAvatar;
}

export interface JoinGameFormProps {
  readonly takenAvatars: readonly string[];
  readonly submitting: boolean;
  readonly onSubmit: (values: JoinGameValues) => void;
}

// @FollowsBlueprint organism-form
export function JoinGameForm({ takenAvatars, submitting, onSubmit }: JoinGameFormProps) {
  const { t } = useTranslation();
  const firstFree = selectFreeAvatars(takenAvatars)[0] ?? MONKEY_AVATARS[0];
  const form = useForm({
    defaultValues: { nickname: '', avatar: firstFree },
    onSubmit: ({ value }) => {
      onSubmit({ nickname: value.nickname.trim(), avatar: value.avatar });
    },
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="nickname"
        validators={{
          onSubmit: ({ value }) =>
            value.trim().length === 0 ? t('errors.nicknameRequired') : undefined,
        }}
      >
        {(field) => (
          <div>
            <FieldLabel htmlFor={field.name}>{t('create.nickname')}</FieldLabel>
            <input
              id={field.name}
              name={field.name}
              type="text"
              autoComplete="nickname"
              maxLength={NICKNAME_MAX_LENGTH}
              placeholder={t('create.nicknamePlaceholder')}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
              }}
              className="w-full rounded-chunk border-[3px] border-ink bg-cream px-4 py-3 text-lg font-extrabold shadow-chunk-sm outline-none focus-visible:bg-peel-soft"
            />
            {field.state.meta.errors.length > 0 ? (
              <p className="mt-1.5 text-sm font-bold text-coral">
                {field.state.meta.errors.join(' ')}
              </p>
            ) : null}
          </div>
        )}
      </form.Field>

      <form.Field name="avatar">
        {(field) => (
          <MonkeyPicker
            legend={t('create.monkey')}
            value={field.state.value}
            taken={takenAvatars}
            onChange={(avatar) => {
              field.handleChange(avatar);
            }}
          />
        )}
      </form.Field>

      <ChunkyButton type="submit" tone="leaf" disabled={submitting}>
        {submitting ? t('join.submitting') : t('join.submit')}
      </ChunkyButton>
    </form>
  );
}
