import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { canSendMessage, MESSAGE_TEXT_LIMIT } from '@domain/routine-run.core';
import { Button } from '../atoms/Button';
import { buttonVariants } from '../atoms/button.variants';
import { Icon, type IconName } from '../atoms/Icon';
import { Notice } from '../atoms/Notice';
import { PageTitle } from '../atoms/PageTitle';
import { Textarea } from '../atoms/Textarea';
import { QueryState } from '../molecules/QueryState';
import { DISPLAY_LOCALE } from '../../lib/calendar-day.utils';
import { useCopyPromptOnLaunch } from '../../lib/prompt-copy.hook';
import { useClaudeCodeTarget } from '../../lib/queries/messages.queries';
import { useLaunchMessageRun } from '../../lib/queries/routine.queries';
import { isRoutineConfigured } from '../../lib/routine-run.core';
import {
  buildClaudeCodeAddress,
  type ClaudeCodeEnvironment,
  composeTalosPrompt,
  selectClaudeCodeLinkTarget,
} from '../../lib/claude-code-address.core';
import { detectClaudeCodeOpener } from '../../lib/claude-code-opener.adapter';
import {
  isEnvironmentLinked,
  isMessageTooLong,
  isMessageTooLongToSend,
  LONG_MESSAGE_THRESHOLD,
} from './message-composer.core';

interface EnvironmentChoice {
  readonly environment: ClaudeCodeEnvironment;
  readonly labelKey: 'message.open-talos' | 'message.open-build';
  readonly icon: IconName;
  readonly className: string;
  readonly iconSize: number;
}

const MAIN_ICON_SIZE = 18;
const DISCREET_ICON_SIZE = 14;

const ENVIRONMENT_CHOICES: readonly EnvironmentChoice[] = [
  {
    environment: 'talos',
    labelKey: 'message.open-talos',
    icon: 'send',
    className: buttonVariants({ variant: 'primary', size: 'lg' }),
    iconSize: MAIN_ICON_SIZE,
  },
  {
    environment: 'build',
    labelKey: 'message.open-build',
    icon: 'build',
    className:
      'self-end inline-flex items-center gap-1.5 min-h-11 px-1 text-caption text-ink-muted underline underline-offset-2',
    iconSize: DISCREET_ICON_SIZE,
  },
];

// @FollowsBlueprint organism-form
export function MessageComposer(): JSX.Element {
  const { t } = useTranslation();
  const target = useClaudeCodeTarget();
  const copyPrompt = useCopyPromptOnLaunch();
  const opener = detectClaudeCodeOpener();
  const launch = useLaunchMessageRun();
  const isConfigured = isRoutineConfigured(launch.error);
  const form = useForm({
    defaultValues: { text: '' },
    onSubmit: ({ value, formApi }) => {
      launch.mutate({ text: value.text }, { onSuccess: () => formApi.reset() });
    },
  });

  return (
    <>
      <PageTitle hasMark>{t('message.title')}</PageTitle>
      <div className="flex flex-col gap-3">
        <label htmlFor="message-text" className="sr-only">
          {t('message.label')}
        </label>
        <form.Field name="text">
          {(field) => (
            <Textarea
              id="message-text"
              rows={7}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              className="min-h-44"
              placeholder={t('message.placeholder')}
            />
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.values.text}>
          {(text) => {
            const isTooLong = isMessageTooLong(text);
            const isTooLongToSend = isMessageTooLongToSend(text, isConfigured);
            const prompt = composeTalosPrompt(t('message.preamble'), text);
            return (
              <>
                {isTooLong ? (
                  <Notice>
                    {t('message.too-long', {
                      length: new Intl.NumberFormat(DISPLAY_LOCALE).format(text.length),
                      limit: new Intl.NumberFormat(DISPLAY_LOCALE).format(LONG_MESSAGE_THRESHOLD),
                    })}
                  </Notice>
                ) : null}
                {isTooLongToSend ? (
                  <Notice>
                    {t('message.too-long-to-send', {
                      limit: new Intl.NumberFormat(DISPLAY_LOCALE).format(MESSAGE_TEXT_LIMIT),
                    })}
                  </Notice>
                ) : null}
                {isConfigured ? (
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={!canSendMessage(text) || launch.isPending}
                    onClick={() => void form.handleSubmit()}
                  >
                    <Icon name="send" size={MAIN_ICON_SIZE} />
                    {t('message.open-talos')}
                  </Button>
                ) : null}
                {target.data === undefined ? (
                  <QueryState isPending={target.isPending} onRetry={() => void target.refetch()} />
                ) : (
                  <div className="flex flex-col gap-1">
                    {ENVIRONMENT_CHOICES.filter((choice) =>
                      isEnvironmentLinked(choice.environment, isConfigured),
                    ).map((choice) => (
                      <a
                        key={choice.environment}
                        href={buildClaudeCodeAddress(
                          {
                            repository: target.data.repository,
                            environmentId: target.data.environments[choice.environment],
                            prompt,
                          },
                          opener,
                        )}
                        target={selectClaudeCodeLinkTarget(opener)}
                        rel="noopener"
                        onClick={() => copyPrompt(prompt)}
                        className={choice.className}
                      >
                        <Icon name={choice.icon} size={choice.iconSize} />
                        {t(choice.labelKey)}
                      </a>
                    ))}
                  </div>
                )}
              </>
            );
          }}
        </form.Subscribe>
      </div>
    </>
  );
}
