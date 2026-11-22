import { useTranslation } from 'react-i18next';
import { type ErrorTranslationKey, selectErrorKey } from '@site/lib/translation-keys.core';

export interface ErrorNoteProps {
  readonly code: string | null;
  readonly selectKey?: (code: string) => ErrorTranslationKey;
}

// @FollowsBlueprint atom-message-from-a-code
export function ErrorNote({ code, selectKey = selectErrorKey }: ErrorNoteProps) {
  const { t } = useTranslation();
  if (code === null) return null;
  return (
    <p role="alert" className="rounded-chip px-3 py-2 text-sm font-semibold bg-surface text-missed">
      {t(selectKey(code))}
    </p>
  );
}
