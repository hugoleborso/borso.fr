import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { WINNING_SCORE_CHOICES } from '@domain/game-setup.core';
import { normalizeJoinCode } from '@api/games/join-code.utils';
import { ChunkyButton } from '@site/components/atoms/ChunkyButton';
import { FieldLabel } from '@site/components/atoms/FieldLabel';
import { MonkeyFace } from '@site/components/atoms/MonkeyFace';
import { RulesPanel } from '@site/components/organisms/RulesPanel';

const JOIN_CODE_LENGTH = 4;
const DEFAULT_WINNING_SCORE = WINNING_SCORE_CHOICES[1];
const SHOWCASE_MONKEYS = ['chimp', 'mandrill', 'lemur'] as const;

// @FollowsBlueprint route-list-page
export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);

  const normalized = normalizeJoinCode(code);
  const canJoin = normalized.length === JOIN_CODE_LENGTH;

  return (
    <div className="space-y-6">
      <section className="text-center">
        <div className="flex items-end justify-center gap-1">
          {SHOWCASE_MONKEYS.map((avatar, index) => (
            <MonkeyFace
              key={avatar}
              avatar={avatar}
              className={index === 1 ? 'h-20 w-20' : 'h-14 w-14'}
            />
          ))}
        </div>
        <h1 className="mt-3 text-4xl font-black leading-tight">{t('appName')}</h1>
        <p className="mt-1 text-base font-bold text-ink-soft">{t('tagline')}</p>
      </section>

      <ChunkyButton
        tone="peel"
        onClick={() => {
          void navigate('/nouvelle-partie');
        }}
      >
        {t('home.createGame')}
      </ChunkyButton>

      <section className="rounded-chunk border-[3px] border-ink bg-cream px-4 py-4 shadow-chunk">
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
            className="min-w-0 flex-1 rounded-chunk border-[3px] border-ink bg-cream-sunk px-4 py-3 text-center text-2xl font-black uppercase tracking-[0.3em] outline-none focus-visible:bg-peel-soft"
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

      <div>
        <ChunkyButton
          tone="cream"
          size="medium"
          aria-expanded={rulesOpen}
          onClick={() => {
            setRulesOpen(!rulesOpen);
          }}
        >
          {t('home.rulesToggle')}
        </ChunkyButton>
        {rulesOpen ? (
          <div className="mt-3">
            <RulesPanel winningScore={DEFAULT_WINNING_SCORE} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
