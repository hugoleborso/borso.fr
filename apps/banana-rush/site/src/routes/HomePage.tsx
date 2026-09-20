import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { WINNING_SCORE_CHOICES } from '@domain/game-setup.core';
import { normalizeJoinCode } from '@api/games/join-code.utils';
import { ChunkyButton } from '@site/components/atoms/ChunkyButton';
import { FieldLabel } from '@site/components/atoms/FieldLabel';
import { MonkeyFace } from '@site/components/atoms/MonkeyFace';
import { RulesPanel } from '@site/components/organisms/RulesPanel';
import { INVITATION_PARAMETER, readInvitedCode } from '@site/lib/invitation.core';

const JOIN_CODE_LENGTH = 4;
const DEFAULT_WINNING_SCORE = WINNING_SCORE_CHOICES[1];
const SHOWCASE_MONKEYS = ['chimp', 'mandrill', 'lemur'] as const;

/**
 * @Blueprint route-one-screen-at-a-time
 * @BlueprintName Route One Screen At A Time
 * @BlueprintUsage Use where a page offers reference material a reader opens on purpose, on a surface that does not scroll.
 * @BlueprintDescription Swaps the reference material in for the page rather than revealing it underneath, so the reader gets the whole viewport for it and the page never has to grow past what the screen shows. A disclosure that expands in place is only workable where the page can scroll to reach what the expansion pushed down; without that, the same interaction hides the controls it was opened from. Swapping keeps the back path explicit — one control returns, which is also what a phone's own back gesture does elsewhere in the application.
 */
export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState('');
  const [areRulesOpen, setAreRulesOpen] = useState(false);

  const invitedCode = readInvitedCode(searchParams.get(INVITATION_PARAMETER));
  const normalized = normalizeJoinCode(code);
  const canJoin = normalized.length === JOIN_CODE_LENGTH;

  if (invitedCode !== null) {
    return <Navigate to={`/partie/${invitedCode}`} replace />;
  }

  if (areRulesOpen) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <RulesPanel winningScore={DEFAULT_WINNING_SCORE} />
        <ChunkyButton
          tone="cream"
          size="medium"
          className="w-full shrink-0"
          onClick={() => {
            setAreRulesOpen(false);
          }}
        >
          {t('common.back')}
        </ChunkyButton>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
      <section className="shrink-0 text-center">
        <div className="flex items-end justify-center gap-1">
          {SHOWCASE_MONKEYS.map((avatar, index) => (
            <MonkeyFace
              key={avatar}
              avatar={avatar}
              className={index === 1 ? 'h-20 w-20' : 'h-14 w-14'}
            />
          ))}
        </div>
        <h1 className="mt-2 text-4xl font-black leading-tight">{t('appName')}</h1>
        <p className="mt-1 text-base font-bold text-ink-soft">{t('tagline')}</p>
      </section>

      <ChunkyButton
        tone="peel"
        className="shrink-0"
        onClick={() => {
          void navigate('/nouvelle-partie');
        }}
      >
        {t('home.createGame')}
      </ChunkyButton>

      <section className="shrink-0 rounded-chunk border-[3px] border-ink bg-cream px-4 py-3 shadow-chunk">
        <FieldLabel htmlFor="join-code">{t('home.joinTitle')}</FieldLabel>
        <div className="flex gap-2">
          <input
            id="join-code"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={JOIN_CODE_LENGTH}
            placeholder={t('home.joinPlaceholder')}
            value={code}
            onChange={(event) => {
              setCode(normalizeJoinCode(event.target.value));
            }}
            className="min-w-0 flex-1 rounded-chunk border-[3px] border-ink bg-cream-sunk px-4 py-2.5 text-center text-2xl font-black uppercase tracking-[0.3em] outline-none focus-visible:bg-peel-soft"
          />
          <ChunkyButton
            tone="leaf"
            size="medium"
            disabled={!canJoin}
            onClick={() => {
              void navigate(`/partie/${normalized}`);
            }}
          >
            {t('home.join')}
          </ChunkyButton>
        </div>
      </section>

      <ChunkyButton
        tone="cream"
        size="medium"
        className="w-full shrink-0"
        aria-expanded={areRulesOpen}
        onClick={() => {
          setAreRulesOpen(true);
        }}
      >
        {t('home.rulesToggle')}
      </ChunkyButton>
    </div>
  );
}
