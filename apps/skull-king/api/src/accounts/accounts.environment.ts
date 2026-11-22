export interface RelyingParty {
  readonly id: string;
  readonly name: string;
  readonly origin: string;
}

const RELYING_PARTY_NAME = 'Skull King';
const RELYING_PARTY_ID_VARIABLE = 'WEBAUTHN_RELYING_PARTY_ID';
const SITE_ORIGIN_VARIABLE = 'WEBAUTHN_ORIGIN';

function readOptional(variableName: string): string | null {
  const value = process.env[variableName];
  return value === undefined || value.length === 0 ? null : value;
}

function readRequired(variableName: string): string {
  const value = readOptional(variableName);
  if (value === null) throw new Error(`${variableName} is not set`);
  return value;
}

// @FollowsBlueprint environment-reader
export function readRelyingParty(): RelyingParty {
  return {
    id: readRequired(RELYING_PARTY_ID_VARIABLE),
    name: RELYING_PARTY_NAME,
    origin: readRequired(SITE_ORIGIN_VARIABLE),
  };
}

export function readSiteOrigin(): string | null {
  return readOptional(SITE_ORIGIN_VARIABLE);
}
