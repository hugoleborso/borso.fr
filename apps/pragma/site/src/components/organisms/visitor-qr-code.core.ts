/** @Feature visitor-qr-code */

const SIGN_UP_PAGE_PATH = '/';

export interface VisitorQrCodeAddress {
  readonly encoded: string;
  readonly shown: string;
}

// @FollowsBlueprint core-decision
export function buildVisitorQrCodeAddress(origin: string): VisitorQrCodeAddress {
  return { encoded: `${origin}${SIGN_UP_PAGE_PATH}`, shown: new URL(origin).host };
}
