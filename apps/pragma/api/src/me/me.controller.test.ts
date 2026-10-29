import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { insertPasskey } from '../auth/credentials.repository';

const passkeysSchema = z.object({
  passkeys: z.array(z.object({ id: z.string().uuid(), label: z.string() })),
});

async function givePasskey(memberId: string): Promise<string> {
  const passkey = await insertPasskey({
    memberId,
    credentialId: `key-of-${memberId}`,
    publicKey: Buffer.from([1, 2, 3]),
    signCounter: 0,
    transports: 'internal',
    label: 'iPhone',
    createdAt: new Date(),
  });
  return passkey.id;
}

const signedInMemberSchema = z.object({
  memberId: z.string().uuid(),
  firstName: z.string(),
  color: z.string(),
  username: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
});

// @FollowsBlueprint test-back-e2e
describe('me controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects the contact write without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/me/contact', {
      method: 'PUT',
      body: { phone: '0601020304' },
    });
    expect(response.status).toBe(401);
  });

  it('has no contact details until the member fills them in', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const member = await readJson(
      await jsonRequest(app, '/api/me', { cookieHeader }),
      signedInMemberSchema,
    );
    expect(member.phone).toBeNull();
    expect(member.email).toBeNull();
  });

  it('saves the details the outreach message is signed with, and reads them back', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const saved = await readJson(
      await jsonRequest(app, '/api/me/contact', {
        method: 'PUT',
        body: { phone: '0601020304', email: 'ada@example.com' },
        cookieHeader,
      }),
      signedInMemberSchema,
    );
    expect(saved.phone).toBe('0601020304');
    expect(saved.email).toBe('ada@example.com');

    const reread = await readJson(
      await jsonRequest(app, '/api/me', { cookieHeader }),
      signedInMemberSchema,
    );
    expect(reread.phone).toBe('0601020304');
    expect(reread.email).toBe('ada@example.com');
  });

  it('writes one detail without clearing the other', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    await jsonRequest(app, '/api/me/contact', {
      method: 'PUT',
      body: { phone: '0601020304', email: 'ada@example.com' },
      cookieHeader,
    });
    const patched = await readJson(
      await jsonRequest(app, '/api/me/contact', {
        method: 'PUT',
        body: { email: 'bob@example.com' },
        cookieHeader,
      }),
      signedInMemberSchema,
    );
    expect(patched.email).toBe('bob@example.com');
    expect(patched.phone).toBe('0601020304');
  });

  it('clears a detail the member emptied', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    await jsonRequest(app, '/api/me/contact', {
      method: 'PUT',
      body: { phone: '0601020304' },
      cookieHeader,
    });
    const cleared = await readJson(
      await jsonRequest(app, '/api/me/contact', {
        method: 'PUT',
        body: { phone: null },
        cookieHeader,
      }),
      signedInMemberSchema,
    );
    expect(cleared.phone).toBeNull();
  });

  it('refuses a body carrying neither detail', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/me/contact', {
      method: 'PUT',
      body: {},
      cookieHeader,
    });
    expect(response.status).toBe(400);
  });

  it('refuses an email that is not one', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const response = await jsonRequest(app, '/api/me/contact', {
      method: 'PUT',
      body: { email: 'not-an-email' },
      cookieHeader,
    });
    expect(response.status).toBe(400);
  });

  it('renames a passkey of the signed-in member', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const passkeyId = await givePasskey(memberId);
    const response = await jsonRequest(app, `/api/me/passkeys/${passkeyId}`, {
      method: 'PATCH',
      body: { label: ' Kitchen iPad ' },
      cookieHeader,
    });
    expect(response.status).toBe(200);
    const listed = await readJson(
      await jsonRequest(app, '/api/me/passkeys', { cookieHeader }),
      passkeysSchema,
    );
    expect(listed.passkeys).toEqual([{ id: passkeyId, label: 'Kitchen iPad' }]);
  });

  it('answers 404 for a passkey of another member and leaves it as it was', async () => {
    const owner = await buildAuthenticatedApp('Owner');
    const { app, cookieHeader } = await buildAuthenticatedApp('Intruder');
    const passkeyId = await givePasskey(owner.memberId);
    const response = await jsonRequest(app, `/api/me/passkeys/${passkeyId}`, {
      method: 'PATCH',
      body: { label: 'Mine now' },
      cookieHeader,
    });
    expect(response.status).toBe(404);
    const listed = await readJson(
      await jsonRequest(owner.app, '/api/me/passkeys', { cookieHeader: owner.cookieHeader }),
      passkeysSchema,
    );
    expect(listed.passkeys.map((passkey) => passkey.label)).toEqual(['iPhone']);
  });

  it('refuses an empty passkey name', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const passkeyId = await givePasskey(memberId);
    const response = await jsonRequest(app, `/api/me/passkeys/${passkeyId}`, {
      method: 'PATCH',
      body: { label: '   ' },
      cookieHeader,
    });
    expect(response.status).toBe(400);
  });
});
