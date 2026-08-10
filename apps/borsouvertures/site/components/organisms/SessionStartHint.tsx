import { useTranslation } from 'react-i18next';
import type { Mode } from '@/state/persistedState.utils';

const HINT_STYLE = { marginTop: '0.5rem', opacity: 0.8 } as const;

const HINT_KEY_BY_MODE: Record<Mode, 'selection.hint.learn' | 'selection.hint.play'> = {
  learn: 'selection.hint.learn',
  play: 'selection.hint.play',
};

interface SessionStartHintProps {
  mode: Mode;
}

/** Says what is still missing before a session can start. */
export function SessionStartHint({ mode }: SessionStartHintProps) {
  const { t } = useTranslation();
  return <p style={HINT_STYLE}>{t(HINT_KEY_BY_MODE[mode])}</p>;
}
