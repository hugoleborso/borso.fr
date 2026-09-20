/** @DependsOnExternal browser-share-sheet */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildInvitationUrl } from '@site/lib/invitation.core';
import { ChunkyButton } from '../atoms/ChunkyButton';
import { LinkIcon } from '../atoms/LinkIcon';

type ShareSheet = (data: ShareData) => Promise<void>;

function readShareSheet(candidate: Navigator): ShareSheet | null {
  return 'share' in candidate ? candidate.share.bind(candidate) : null;
}

export interface ShareInviteButtonProps {
  readonly joinCode: string;
}

/**
 * @Blueprint molecule-handing-an-address-to-someone-else
 * @BlueprintName Molecule Handing An Address To Someone Else
 * @BlueprintUsage Use wherever a player has to get a link to the people who are not in the room yet.
 * @BlueprintDescription Offers the phone's own share sheet when it has one and falls back to the clipboard when it does not, because the share sheet is the only path that reaches a messaging application in one tap on a phone and the clipboard is the only one that exists on a desktop. Both are read off `navigator` at the moment of the tap rather than at render, so a browser that exposes neither simply leaves the address visible below the button instead of showing a control that does nothing. The confirmation is local state with no timer: it is replaced by the next tap and by leaving the screen, which is the whole of its lifetime.
 */
export function ShareInviteButton({ joinCode }: ShareInviteButtonProps) {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);
  const invitationUrl = buildInvitationUrl(globalThis.location.origin, joinCode);

  const share = async () => {
    const shareSheet = readShareSheet(navigator);
    if (shareSheet !== null) {
      await shareSheet({ title: t('appName'), text: t('lobby.shareText'), url: invitationUrl });
      return;
    }
    await navigator.clipboard.writeText(invitationUrl);
    setIsCopied(true);
  };

  return (
    <div className="space-y-2">
      <ChunkyButton
        tone="cream"
        size="medium"
        className="w-full"
        onClick={() => {
          share().catch(() => setIsCopied(false));
        }}
      >
        <LinkIcon className="h-5 w-5" />
        {isCopied ? t('lobby.linkCopied') : t('lobby.shareLink')}
      </ChunkyButton>
      <p className="break-all text-center text-xs font-bold text-ink-soft">{invitationUrl}</p>
    </div>
  );
}
