/** @Feature auth */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { didCopyTextToClipboard } from '../../lib/clipboard.adapter';
import { type BrandName, BrandLogo } from '../atoms/BrandLogo';
import { Button } from '../atoms/Button';

type CopyOutcome = 'idle' | 'copied' | 'refused';

const COPY_OUTCOME_KEY = {
  idle: null,
  copied: 'account.assistants.copied',
  refused: 'account.assistants.copyFailed',
} as const;
const LOGO_SIZE_PX = 28;

export interface InstallCommandBlockProps {
  readonly brand: BrandName;
  readonly label: string;
  readonly snippet: string;
}

// @FollowsBlueprint molecule-local-state
export function InstallCommandBlock(props: InstallCommandBlockProps): JSX.Element {
  const { t } = useTranslation();
  const [copyOutcome, setCopyOutcome] = useState<CopyOutcome>('idle');
  const outcomeKey = COPY_OUTCOME_KEY[copyOutcome];
  const copySnippet = async (): Promise<void> => {
    const isCopied = await didCopyTextToClipboard(props.snippet);
    setCopyOutcome(isCopied ? 'copied' : 'refused');
  };

  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex min-h-11 items-center gap-3">
        <BrandLogo brand={props.brand} size={LOGO_SIZE_PX} />
        <span className="min-w-0 flex-1 truncate text-ink">{props.label}</span>
        <Button
          type="button"
          size="sm"
          icon="copy"
          aria-label={t('account.assistants.copyFor', { assistant: props.label })}
          onClick={() => void copySnippet()}
        >
          {t('account.assistants.copy')}
        </Button>
      </div>
      {outcomeKey === null ? null : (
        <p role="status" className="text-meta text-ink-soft m-0">
          {t(outcomeKey)}
        </p>
      )}
    </li>
  );
}
