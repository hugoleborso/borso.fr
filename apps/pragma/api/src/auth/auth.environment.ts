export interface RelyingParty {
  readonly id: string;
  readonly name: string;
  readonly origin: string;
}

const RELYING_PARTY_NAME = 'pragma';
const RELYING_PARTY_ID_VARIABLE = 'WEBAUTHN_RELYING_PARTY_ID';
const RELYING_PARTY_ORIGIN_VARIABLE = 'WEBAUTHN_ORIGIN';

export class MissingRelyingPartyConfiguration extends Error {
  constructor(variableName: string) {
    super(`${variableName} is not set`);
    this.name = 'MissingRelyingPartyConfiguration';
  }
}

function readRequired(variableName: string): string {
  const value = process.env[variableName];
  if (value === undefined || value.length === 0) {
    throw new MissingRelyingPartyConfiguration(variableName);
  }
  return value;
}

export function readRelyingParty(): RelyingParty {
  return {
    id: readRequired(RELYING_PARTY_ID_VARIABLE),
    name: RELYING_PARTY_NAME,
    origin: readRequired(RELYING_PARTY_ORIGIN_VARIABLE),
  };
}
