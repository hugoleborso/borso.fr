import {
  MAXIMUM_SEATS,
  MINIMUM_SEATS,
  ROUND_TIMER_CHOICES_SECONDS,
  type RoundTimerSeconds,
  WINNING_SCORE_CHOICES,
  type WinningScore,
} from '@domain/game-setup.core';
import { MONKEY_AVATARS, type MonkeyAvatar, NICKNAME_MAX_LENGTH } from '@domain/monkey.core';
import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';
import { ChunkyButton } from '../atoms/ChunkyButton';
import { FieldLabel } from '../atoms/FieldLabel';
import { MonkeyPicker } from '../molecules/MonkeyPicker';
import { SegmentedChoice } from '../atoms/SegmentedChoice';

const NO_TIMER = 0 as const;
const FIRST_MONKEY: MonkeyAvatar = MONKEY_AVATARS[0];
const DEFAULT_SEATS = 4;
const DEFAULT_WINNING_SCORE = WINNING_SCORE_CHOICES[1];

export interface CreateGameValues {
  readonly nickname: string;
  readonly avatar: MonkeyAvatar;
  readonly maxPlayers: number;
  readonly winningScore: WinningScore;
  readonly roundTimerSeconds: RoundTimerSeconds | null;
}

interface CreateGameFields {
  nickname: string;
  avatar: MonkeyAvatar;
  maxPlayers: number;
  winningScore: WinningScore;
  roundTimerSeconds: RoundTimerSeconds | typeof NO_TIMER;
}

export interface CreateGameFormProps {
  readonly submitting: boolean;
  readonly onSubmit: (values: CreateGameValues) => void;
}

const seatOptions = Array.from(
  { length: MAXIMUM_SEATS - MINIMUM_SEATS + 1 },
  (_unused, index) => MINIMUM_SEATS + index,
);

/**
 * @Blueprint organism-form-of-closed-choices
 * @BlueprintName Organism Form Of Closed Choices
 * @BlueprintUsage Use for a creation screen where every field but one is a short closed list, on a device held in one hand.
 * @BlueprintDescription Builds every option list from the shared domain constants rather than writing the numbers into the markup, so a rule changed in the domain file changes the screen and the API validation together and neither can be forgotten. The whole form is one `useForm` rather than a state hook per field, which is what keeps the submit path single and the dirty tracking free. Only the free text field carries a validator here, because every other control can only produce a value the domain already named.
 */
export function CreateGameForm({ submitting, onSubmit }: CreateGameFormProps) {
  const { t } = useTranslation();
  const defaultValues: CreateGameFields = {
    nickname: '',
    avatar: FIRST_MONKEY,
    maxPlayers: DEFAULT_SEATS,
    winningScore: DEFAULT_WINNING_SCORE,
    roundTimerSeconds: NO_TIMER,
  };
  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => {
      onSubmit({
        nickname: value.nickname.trim(),
        avatar: value.avatar,
        maxPlayers: value.maxPlayers,
        winningScore: value.winningScore,
        roundTimerSeconds: value.roundTimerSeconds === NO_TIMER ? null : value.roundTimerSeconds,
      });
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
            taken={[]}
            onChange={(avatar) => {
              field.handleChange(avatar);
            }}
          />
        )}
      </form.Field>

      <form.Field name="maxPlayers">
        {(field) => (
          <SegmentedChoice<number>
            legend={t('create.seats')}
            value={field.state.value}
            options={seatOptions.map((seats) => ({ value: seats, label: String(seats) }))}
            onChange={(seats) => {
              field.handleChange(seats);
            }}
          />
        )}
      </form.Field>

      <form.Field name="winningScore">
        {(field) => (
          <SegmentedChoice<WinningScore>
            legend={t('create.winningScore')}
            value={field.state.value}
            options={WINNING_SCORE_CHOICES.map((score) => ({
              value: score,
              label: String(score),
            }))}
            onChange={(score) => {
              field.handleChange(score);
            }}
          />
        )}
      </form.Field>

      <form.Field name="roundTimerSeconds">
        {(field) => (
          <SegmentedChoice<RoundTimerSeconds | typeof NO_TIMER>
            legend={t('create.timer')}
            value={field.state.value}
            options={[
              ...ROUND_TIMER_CHOICES_SECONDS.map((seconds) => ({
                value: seconds,
                label: t('create.timerSeconds', { count: seconds }),
              })),
              { value: NO_TIMER, label: t('create.timerNone') },
            ]}
            onChange={(seconds) => {
              field.handleChange(seconds);
            }}
          />
        )}
      </form.Field>

      <ChunkyButton type="submit" tone="leaf" disabled={submitting}>
        {submitting ? t('create.submitting') : t('create.submit')}
      </ChunkyButton>
    </form>
  );
}
