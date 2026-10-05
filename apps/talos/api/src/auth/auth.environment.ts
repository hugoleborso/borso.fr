import { selectExpectedOrigins } from './auth.core';

export interface RelyingParty {
  readonly id: string;
  readonly name: string;
  readonly origins: string[];
}

const RELYING_PARTY_NAME = 'Talos';
const RELYING_PARTY_ID_VARIABLE = 'TALOS_RP_ID';
const STAGE_VARIABLE = 'STAGE';
const DEFAULT_RELYING_PARTY_ID = 'talos.borso.fr';

// @FollowsBlueprint environment-reader
export function readRelyingParty(): RelyingParty {
  const id = process.env[RELYING_PARTY_ID_VARIABLE] ?? DEFAULT_RELYING_PARTY_ID;
  return {
    id,
    name: RELYING_PARTY_NAME,
    origins: selectExpectedOrigins(id, process.env[STAGE_VARIABLE]),
  };
}

export function readStage(): string | undefined {
  return process.env[STAGE_VARIABLE];
}
