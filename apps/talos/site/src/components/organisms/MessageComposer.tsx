import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { PageTitle } from '../atoms/PageTitle';
import { Textarea } from '../atoms/Textarea';
import { useSendMessage } from '../../lib/queries/messages.queries';
import { canSendMessage } from './message-composer.core';

// @FollowsBlueprint organism-form
export function MessageComposer(): JSX.Element {
  const { t } = useTranslation();
  const sendMessage = useSendMessage();
  const form = useForm({
    defaultValues: { text: '' },
    onSubmit: async ({ value, formApi }) => {
      await sendMessage.mutateAsync(value.text.trim()).then(
        () => formApi.reset(),
        () => undefined,
      );
    },
  });

  return (
    <>
      <PageTitle subtitle={t('message.lead')}>{t('message.title')}</PageTitle>
      {sendMessage.isSuccess ? (
        <Card tone="bronze" padding="lg" className="flex flex-col items-center gap-3 text-center">
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-bronze text-on-bronze">
            <Icon name="check" size={24} />
          </span>
          <p className="m-0 text-lg font-semibold text-ink">{t('message.sent')}</p>
          <Button variant="secondary" onClick={() => sendMessage.reset()}>
            {t('message.another')}
          </Button>
        </Card>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
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
          <form.Subscribe selector={(state) => [state.values.text, state.isSubmitting] as const}>
            {([text, isSubmitting]) => (
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !canSendMessage(text)}
              >
                <Icon name="send" size={18} />
                {t('message.send')}
              </Button>
            )}
          </form.Subscribe>
        </form>
      )}
    </>
  );
}
