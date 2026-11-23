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
  readonly variant: 'surface' | 'tile';
}

// @FollowsBlueprint molecule-handing-an-address-to-someone-else
export function ShareButton({ joinCode, variant }: ShareButtonProps) {
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
      variant={variant}
      aria-label={isCopied ? t('common.linkCopied') : t('common.share')}
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
