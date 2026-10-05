export type RegistrationAccess = 'session' | 'bootstrap-code' | 'closed';

export type PasskeyRemoval = 'removable' | 'not-found' | 'last';

const DEVELOPMENT_STAGE = 'dev';
const DEVELOPMENT_SITE_ORIGIN = 'http://localhost:5180';

// @FollowsBlueprint core-decision
export function decideRegistrationAccess(params: {
  readonly hasPasskey: boolean;
  readonly isSignedIn: boolean;
}): RegistrationAccess {
  if (!params.hasPasskey) return 'bootstrap-code';
  return params.isSignedIn ? 'session' : 'closed';
}

export function selectExpectedOrigins(relyingPartyId: string, stage: string | undefined): string[] {
  const productionOrigin = `https://${relyingPartyId}`;
  return stage === DEVELOPMENT_STAGE
    ? [productionOrigin, DEVELOPMENT_SITE_ORIGIN]
    : [productionOrigin];
}

export function isSecureCookieStage(stage: string | undefined): boolean {
  return stage !== DEVELOPMENT_STAGE;
}

export function decidePasskeyRemoval(params: {
  readonly passkeyCount: number;
  readonly isKnown: boolean;
}): PasskeyRemoval {
  if (!params.isKnown) return 'not-found';
  return params.passkeyCount > 1 ? 'removable' : 'last';
}
