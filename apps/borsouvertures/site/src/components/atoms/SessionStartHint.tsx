import { useTranslation } from 'react-i18next';
import type { Mode } from '@/state/persistedState.utils';

// @FollowsBlueprint core-label-key
const HINT_KEY_BY_MODE: Record<Mode, 'selection.hint.learn' | 'selection.hint.play'> = {
  learn: 'selection.hint.learn',
  play: 'selection.hint.play',
};

interface SessionStartHintProps {
  mode: Mode;
}

// @FollowsBlueprint atom-plain
export function SessionStartHint({ mode }: SessionStartHintProps) {
  const { t } = useTranslation();
  return <p className="mt-2 mb-4 opacity-80">{t(HINT_KEY_BY_MODE[mode])}</p>;
}
