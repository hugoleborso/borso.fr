const ISSUER_VARIABLE = 'OAUTH_ISSUER';
const CONSENT_ORIGIN_VARIABLE = 'OAUTH_CONSENT_ORIGIN';

interface OAuthOrigins {
  readonly issuer: string;
  readonly consentOrigin: string;
}

class MissingOAuthConfiguration extends Error {
  constructor(variableName: string) {
    super(`${variableName} is not set`);
    this.name = 'MissingOAuthConfiguration';
  }
}

function readRequired(variableName: string): string {
  const value = process.env[variableName];
  if (value === undefined || value.length === 0) {
    throw new MissingOAuthConfiguration(variableName);
  }
  return value;
}

// @FollowsBlueprint environment-reader
export function readOAuthOrigins(): OAuthOrigins {
  return {
    issuer: readRequired(ISSUER_VARIABLE),
    consentOrigin: readRequired(CONSENT_ORIGIN_VARIABLE),
  };
}
