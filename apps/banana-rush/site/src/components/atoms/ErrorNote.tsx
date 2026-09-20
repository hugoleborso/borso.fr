import { useTranslation } from 'react-i18next';
import { selectErrorKey } from '@site/lib/translation-keys.core';
import { BananaIcon } from './BananaIcon';

export interface ErrorNoteProps {
  readonly code: string | null;
}

/**
 * @Blueprint atom-message-from-a-code
 * @BlueprintName Atom Message From A Code
 * @BlueprintUsage Use wherever a failure reaches a screen, so no component ever renders a sentence that came over the network.
 * @BlueprintDescription Turns the code into a translation key through a pure lookup rather than a template literal, which is what keeps every key visible to the catalogue parity test, and falls back to the one key that always exists so a refusal a later version of the API introduces still reads as a sentence. Rendering nothing for the absence of a failure keeps the caller free of a conditional, so a screen places this once and forgets about it.
 */
export function ErrorNote({ code }: ErrorNoteProps) {
  const { t } = useTranslation();
  if (code === null) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-chunk border-[3px] border-ink bg-coral-soft px-3 py-2 text-sm font-bold"
    >
      <BananaIcon className="mt-0.5 h-4 w-4 shrink-0" />
      {t(selectErrorKey(code))}
    </p>
  );
}
