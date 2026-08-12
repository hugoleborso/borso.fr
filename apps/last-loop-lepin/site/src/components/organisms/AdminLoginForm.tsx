import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { selectLabel } from '../../lib/label.utils';
import { useAdminLogin } from '../../lib/queries/auth';
import { Button } from '../atoms/Button';
import { Card, CardBody } from '../atoms/Card';
import { ErrorText } from '../atoms/ErrorText';
import { Input } from '../atoms/Input';
import { Label } from '../atoms/Label';
import { Show } from '../atoms/Show';
import { CardHeader } from '../molecules/CardHeader';
import { type AdminErrorMessage, selectAdminLoginError } from './admin-errors.core';
import { adminLoginSchema, PIN_INPUT_ID } from './admin-login.core';

interface AdminLoginFormProps {
  readonly onAuthenticated: () => void;
}

/** PIN entry that opens the organiser screens. */
// @FollowsBlueprint organism-form
export function AdminLoginForm({ onAuthenticated }: AdminLoginFormProps) {
  const { t } = useTranslation();
  const [failure, setFailure] = useState<AdminErrorMessage | null>(null);
  const login = useAdminLogin();
  const form = useForm({
    defaultValues: { pin: '' },
    validators: { onChange: adminLoginSchema },
    onSubmit: ({ value }) => {
      setFailure(null);
      login.mutate(
        { pin: value.pin },
        {
          onSuccess: () => {
            onAuthenticated();
          },
          onError: (error: unknown) => {
            setFailure(selectAdminLoginError(error));
          },
        },
      );
    },
  });

  return (
    <Card className="max-w-[360px] mx-auto my-[10vh] gap-3">
      <CardHeader title={t('admin.title')} />
      <CardBody className="flex flex-col gap-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={PIN_INPUT_ID}>{t('admin.pin-label')}</Label>
            <form.Field name="pin">
              {(field) => (
                <Input
                  id={PIN_INPUT_ID}
                  type="password"
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  onBlur={field.handleBlur}
                  autoComplete="current-password"
                  required
                  minimumLength={4}
                />
              )}
            </form.Field>
          </div>
          <Show when={failure !== null}>
            <ErrorText>{t(failure?.key ?? 'admin.sign-in-failed', failure?.parameters)}</ErrorText>
          </Show>
          <Button type="submit" variant="primary" disabled={login.isPending}>
            {t(selectLabel(login.isPending, 'admin.signing-in', 'admin.sign-in'))}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
