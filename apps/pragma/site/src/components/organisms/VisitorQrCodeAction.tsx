/** @Feature visitor-qr-code */

import { QRCodeSVG } from 'qrcode.react';
import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Sheet } from '../molecules/Sheet';
import { buildVisitorQrCodeAddress } from './visitor-qr-code.core';

const QUIET_ZONE_MODULES = 4;
const LIGHT_MODULE_COLOUR = '#ffffff';
const DARK_MODULE_COLOUR = '#000000';

export interface VisitorQrCodeActionProps {
  readonly className?: string;
}

// @FollowsBlueprint organism-presentational
export function VisitorQrCodeAction({ className }: VisitorQrCodeActionProps): JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const title = t('visitorQr.title');
  const address = buildVisitorQrCodeAddress(globalThis.location.origin);
  return (
    <>
      <Button
        variant="secondary"
        icon="userPlus"
        className={className}
        onClick={() => setIsOpen(true)}
      >
        {title}
      </Button>
      {isOpen ? (
        <Sheet title={title} label={title} onClose={() => setIsOpen(false)}>
          <figure className="m-0 flex flex-col items-center gap-3 pb-2">
            <div className="w-full overflow-hidden rounded-lg sm:max-w-80">
              <QRCodeSVG
                value={address.encoded}
                level="M"
                marginSize={QUIET_ZONE_MODULES}
                bgColor={LIGHT_MODULE_COLOUR}
                fgColor={DARK_MODULE_COLOUR}
                title={t('visitorQr.codeLabel')}
                role="img"
                aria-label={t('visitorQr.codeLabel')}
                className="block h-auto w-full"
              />
            </div>
            <figcaption className="font-mono text-body break-all text-ink">
              {address.shown}
            </figcaption>
          </figure>
        </Sheet>
      ) : null}
    </>
  );
}
