/**
 * Login page — the only public route. Submits the shared password to
 * POST /api/auth/login, redirects to the originating page on success
 * (or /catalog if there isn't one), surfaces the spec-defined error
 * states (rate-limited, wrong password, not bootstrapped).
 *
 * Design bundle source of truth: cream paper, centred card, blue
 * accent on the submit button, serif italic display title.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../components/atoms/Button';
import { Card } from '../components/atoms/Card';
import { Input } from '../components/atoms/Input';
import { ApiError, apiRequest } from '../lib/api-client';

const locationStateSchema = z.object({ from: z.string().min(1) }).partial();

function readFromState(state: unknown): string {
  const parsed = locationStateSchema.safeParse(state);
  if (!parsed.success) return '/catalog';
  return parsed.data.from ?? '/catalog';
}

export function Login(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest('/api/auth/login', { method: 'POST', body: { password } });
      navigate(readFromState(location.state), { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.status === 429) setError(t('auth.rateLimited'));
        else if (caught.status === 401) setError(t('auth.invalidPassword'));
        else if (caught.status === 503) setError(t('auth.notBootstrapped'));
        else setError(t('auth.unknownError'));
      } else {
        setError(t('auth.unknownError'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-4 py-8">
      <Card className="w-full max-w-[420px] p-8">
        <h1 className="font-display italic text-[44px] leading-none tracking-[-0.015em] text-ink-900 m-0 mb-1">
          {t('appName')}
        </h1>
        <p className="text-[11px] tracking-[0.18em] uppercase text-ink-500 mb-6">
          {t('appWordmark')}
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label
            htmlFor="login-password"
            className="text-[11px] tracking-wider uppercase text-ink-400 font-medium"
          >
            {t('auth.passwordLabel')}
          </label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            minLength={8}
          />
          <Button type="submit" variant="accent" disabled={submitting} className="mt-2">
            {t('auth.submit')}
          </Button>
          {error !== null ? (
            <p className="text-danger text-sm" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </Card>
    </main>
  );
}
