import { createHash, generateKeyPairSync, type KeyObject, randomBytes, sign } from 'node:crypto';

type CborValue = number | string | Uint8Array | ReadonlyMap<CborValue, CborValue>;

const USER_PRESENT = 0x01;
const USER_VERIFIED = 0x04;
const ATTESTED_CREDENTIAL = 0x40;

function encodeHead(majorType: number, length: number): number[] {
  const prefix = majorType << 5;
  if (length < 24) return [prefix | length];
  if (length < 256) return [prefix | 24, length];
  return [prefix | 25, length >> 8, length & 0xff];
}

function encodeCbor(value: CborValue): number[] {
  if (typeof value === 'number') {
    return value >= 0 ? encodeHead(0, value) : encodeHead(1, -1 - value);
  }
  if (typeof value === 'string') {
    const bytes = [...Buffer.from(value, 'utf8')];
    return [...encodeHead(3, bytes.length), ...bytes];
  }
  if (value instanceof Uint8Array) return [...encodeHead(2, value.length), ...value];
  return [
    ...encodeHead(5, value.size),
    ...[...value].flatMap(([key, entry]) => [...encodeCbor(key), ...encodeCbor(entry)]),
  ];
}

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

function sha256(data: Uint8Array | string): Buffer {
  return createHash('sha256').update(data).digest();
}

function encodeCounter(counter: number): Buffer {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32BE(counter);
  return bytes;
}

export interface SoftwareAuthenticator {
  readonly credentialId: string;
  readonly register: (challenge: string, origin: string) => Record<string, unknown>;
  readonly authenticate: (challenge: string, origin: string) => Record<string, unknown>;
}

function buildCosePublicKey(publicKey: KeyObject): Uint8Array {
  const jwk = publicKey.export({ format: 'jwk' });
  return Uint8Array.from(
    encodeCbor(
      new Map<CborValue, CborValue>([
        [1, 2],
        [3, -7],
        [-1, 1],
        [-2, Buffer.from(jwk.x ?? '', 'base64url')],
        [-3, Buffer.from(jwk.y ?? '', 'base64url')],
      ]),
    ),
  );
}

function encodeClientData(type: string, challenge: string, origin: string): Buffer {
  return Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
}

// @FollowsBlueprint test-fixtures-object-mother
export function createSoftwareAuthenticator(relyingPartyId: string): SoftwareAuthenticator {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const credentialId = randomBytes(16);
  const relyingPartyHash = sha256(relyingPartyId);
  let counter = 0;
  return {
    credentialId: base64url(credentialId),
    register: (challenge, origin) => {
      const credentialIdLength = Buffer.alloc(2);
      credentialIdLength.writeUInt16BE(credentialId.length);
      const authenticatorData = Buffer.concat([
        relyingPartyHash,
        Buffer.from([USER_PRESENT | USER_VERIFIED | ATTESTED_CREDENTIAL]),
        encodeCounter(counter),
        Buffer.alloc(16),
        credentialIdLength,
        credentialId,
        buildCosePublicKey(publicKey),
      ]);
      const attestationObject = Uint8Array.from(
        encodeCbor(
          new Map<CborValue, CborValue>([
            ['fmt', 'none'],
            ['attStmt', new Map()],
            ['authData', authenticatorData],
          ]),
        ),
      );
      return {
        id: base64url(credentialId),
        rawId: base64url(credentialId),
        type: 'public-key',
        clientExtensionResults: {},
        response: {
          clientDataJSON: base64url(encodeClientData('webauthn.create', challenge, origin)),
          attestationObject: base64url(attestationObject),
          transports: ['internal', 'pigeon'],
        },
      };
    },
    authenticate: (challenge, origin) => {
      counter += 1;
      const authenticatorData = Buffer.concat([
        relyingPartyHash,
        Buffer.from([USER_PRESENT | USER_VERIFIED]),
        encodeCounter(counter),
      ]);
      const clientData = encodeClientData('webauthn.get', challenge, origin);
      const signature = sign(
        'sha256',
        Buffer.concat([authenticatorData, sha256(clientData)]),
        privateKey,
      );
      return {
        id: base64url(credentialId),
        rawId: base64url(credentialId),
        type: 'public-key',
        clientExtensionResults: {},
        response: {
          clientDataJSON: base64url(clientData),
          authenticatorData: base64url(authenticatorData),
          signature: base64url(signature),
        },
      };
    },
  };
}
