import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';

const JWT_TTL_SECONDS = 12 * 60 * 60;
const JWT_ISSUER = 'last-loop-lepin';
const JWT_AUDIENCE = 'admin';

export class JwtVerificationError extends Error {
  override readonly name = 'JwtVerificationError';
}

export interface AdminSession {
  readonly subject: 'admin';
  readonly issuedAt: number;
  readonly expiresAt: number;
}

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/**
 * Sign a short-lived admin session token. Used after a successful PIN
 * verification; the resulting JWT is placed in the `lastloop_admin` HttpOnly
 * cookie.
 */
export async function signAdminSession(secret: string, issuedAt: Date): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject('admin')
    .setIssuedAt(Math.floor(issuedAt.getTime() / 1000))
    .setExpirationTime(Math.floor(issuedAt.getTime() / 1000) + JWT_TTL_SECONDS)
    .sign(encodeSecret(secret));
}

export async function verifyAdminSession(secret: string, token: string): Promise<AdminSession> {
  try {
    const { payload } = await jwtVerify(token, encodeSecret(secret), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (payload.sub !== 'admin') {
      throw new JwtVerificationError('subject mismatch');
    }
    if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') {
      throw new JwtVerificationError('missing iat or exp');
    }
    return { subject: 'admin', issuedAt: payload.iat * 1000, expiresAt: payload.exp * 1000 };
  } catch (error) {
    if (error instanceof joseErrors.JOSEError) {
      throw new JwtVerificationError(error.message);
    }
    throw error;
  }
}

