import type { JSX } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QR_CODE_SIZE_PX = 160;
const QR_CODE_MARGIN_MODULES = 2;

export interface VoteQrCodeProps {
  readonly value: string;
  readonly title: string;
}

// @FollowsBlueprint atom-plain
export function VoteQrCode({ value, title }: VoteQrCodeProps): JSX.Element {
  return (
    <QRCodeSVG
      value={value}
      title={title}
      size={QR_CODE_SIZE_PX}
      marginSize={QR_CODE_MARGIN_MODULES}
      className="h-auto w-full max-w-40 rounded-md bg-white p-2"
    />
  );
}
