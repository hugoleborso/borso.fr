import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '../atoms/button.variants';
import { Icon, type IconName } from '../atoms/Icon';
import { Notice } from '../atoms/Notice';
import { PageTitle } from '../atoms/PageTitle';
import { Textarea } from '../atoms/Textarea';
import { QueryState } from '../molecules/QueryState';
import { DISPLAY_LOCALE } from '../../lib/calendar-day.utils';
import { useClaudeCodeTarget } from '../../lib/queries/messages.queries';
import {
  buildClaudeCodeAddress,
  type ClaudeCodeEnvironment,
  composeTalosPrompt,
  isMessageTooLong,
  LONG_MESSAGE_THRESHOLD,
} from './message-composer.core';

interface EnvironmentChoice {
  readonly environment: ClaudeCodeEnvironment;
  readonly labelKey: 'message.open-talos' | 'message.open-build';
  readonly icon: IconName;
  readonly variant: 'primary' | 'secondary';
}

const ENVIRONMENT_CHOICES: readonly EnvironmentChoice[] = [
  { environment: 'talos', labelKey: 'message.open-talos', icon: 'send', variant: 'primary' },
  { environment: 'build', labelKey: 'message.open-build', icon: 'build', variant: 'secondary' },
];

// @FollowsBlueprint organism-form
export function MessageComposer(): JSX.Element {
  const { t } = useTranslation();
  const target = useClaudeCodeTarget();
  const form = useForm({ defaultValues: { text: '' } });

  return (
    <>
      <PageTitle subtitle={t('message.lead')}>{t('message.title')}</PageTitle>
      <div className="flex flex-col gap-3">
        <label htmlFor="message-text" className="sr-only">
          {t('message.label')}
        </label>
        <form.Field name="text">
          {(field) => (
            <Textarea
              id="message-text"
              rows={7}
              placeholder={t('message.placeholder')}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              className="min-h-44"
            />
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.values.text}>
          {(text) => {
            const isTooLong = isMessageTooLong(text);
            return (
              <>
                {isTooLong ? (
                  <Notice>
                    {t('message.too-long', {
                      limit: new Intl.NumberFormat(DISPLAY_LOCALE).format(LONG_MESSAGE_THRESHOLD),
                    })}
                  </Notice>
                ) : null}
                {target.data === undefined ? (
                  <QueryState isPending={target.isPending} onRetry={() => void target.refetch()} />
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {ENVIRONMENT_CHOICES.map((choice) => (
                      <a
                        key={choice.environment}
                        href={buildClaudeCodeAddress({
                          repository: target.data.repository,
                          environmentId: target.data.environments[choice.environment],
                          prompt: composeTalosPrompt(t('message.preamble'), text),
                        })}
                        target="_blank"
                        rel="noopener"
                        className={buttonVariants({
                          variant: choice.variant,
                          className: 'sm:flex-1',
                        })}
                      >
                        <Icon name={choice.icon} size={18} />
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
