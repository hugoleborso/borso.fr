/** @DependsOnExternal browser-share-sheet */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildInvitationUrl } from '@site/lib/game-address.core';
import { Button } from '../atoms/Button';
import { Glyph } from '../atoms/Glyph';

type ShareSheet = (data: ShareData) => Promise<void>;

function readShareSheet(candidate: Navigator): ShareSheet | null {
  return 'share' in candidate ? candidate.share.bind(candidate) : null;
}

export interface ShareButtonProps {
  readonly joinCode: string;
  readonly size: 'surface' | 'large';
}

// @FollowsBlueprint molecule-handing-an-address-to-someone-else
export function ShareButton({ joinCode, size }: ShareButtonProps) {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);

  const share = async () => {
    const invitationUrl = buildInvitationUrl(globalThis.location.origin, joinCode);
    const shareSheet = readShareSheet(navigator);
    if (shareSheet !== null) {
      await shareSheet({ title: t('appName'), text: t('common.shareText'), url: invitationUrl });
      return;
    }
    await navigator.clipboard.writeText(invitationUrl);
    setIsCopied(true);
  };

  return (
    <Button
      variant="surface"
      aria-label={isCopied ? t('common.linkCopied') : t('common.share')}
      className={size === 'large' ? 'size-12 rounded-tile' : undefined}
      onClick={() => {
        share().catch(() => {
          setIsCopied(false);
        });
      }}
    >
      <Glyph name={isCopied ? 'check' : 'share'} />
    </Button>
  );
}
