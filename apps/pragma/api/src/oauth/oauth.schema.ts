import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

const CLIENT_NAME_MAX_LENGTH = 200;
const REDIRECT_URI_MAX_LENGTH = 2_000;
const REDIRECT_URIS_MAX_COUNT = 10;
const METADATA_LIST_MAX_COUNT = 10;
const METADATA_FIELD_MAX_LENGTH = 200;
const CLIENT_ID_MAX_LENGTH = 100;
const STATE_MAX_LENGTH = 1_000;
const SCOPE_MAX_LENGTH = 1_000;
const CODE_CHALLENGE_MAX_LENGTH = 200;
const OPAQUE_TOKEN_MAX_LENGTH = 200;
const CODE_VERIFIER_MIN_LENGTH = 43;
const CODE_VERIFIER_MAX_LENGTH = 128;
const CODE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]+$/;

// @FollowsBlueprint schema-dsql-constraints
export const assistantClientTable = pgTable('assistant_client', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  redirectUris: text('redirect_uris').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const assistantAuthorizationCodeTable = pgTable('assistant_authorization_code', {
  codeHash: text('code_hash').primaryKey(),
  clientId: text('client_id').notNull(),
  memberId: uuid('member_id').notNull(),
  redirectUri: text('redirect_uri').notNull(),
  codeChallenge: text('code_challenge').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const assistantGrantTable = pgTable(
  'assistant_grant',
  {
    id: uuid('id').primaryKey(),
    clientId: text('client_id').notNull(),
    memberId: uuid('member_id').notNull(),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    refreshFamilyHash: text('refresh_family_hash').notNull(),
    refreshExpiresAt: timestamp('refresh_expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    accessTokenHash: text('access_token_hash').notNull(),
    accessExpiresAt: timestamp('access_expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    sessionEpoch: integer('session_epoch').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('assistant_grant_refresh_token_hash_unique').on(table.refreshTokenHash),
    uniqueIndex('assistant_grant_refresh_family_hash_unique').on(table.refreshFamilyHash),
    uniqueIndex('assistant_grant_access_token_hash_unique').on(table.accessTokenHash),
    index('assistant_grant_member_idx').on(table.memberId),
  ],
);

const metadataListSchema = z
  .array(z.string().max(METADATA_FIELD_MAX_LENGTH))
  .max(METADATA_LIST_MAX_COUNT)
  .optional();

export const clientRegistrationSchema = z.object({
  redirect_uris: z
    .array(z.string().min(1).max(REDIRECT_URI_MAX_LENGTH))
    .min(1)
    .max(REDIRECT_URIS_MAX_COUNT),
  client_name: z.string().trim().min(1).max(CLIENT_NAME_MAX_LENGTH).optional(),
  grant_types: metadataListSchema,
  response_types: metadataListSchema,
  token_endpoint_auth_method: z.string().max(METADATA_FIELD_MAX_LENGTH).optional(),
  scope: z.string().max(SCOPE_MAX_LENGTH).optional(),
});

export type ClientRegistration = z.infer<typeof clientRegistrationSchema>;

export const authorizationQuerySchema = z.object({
  response_type: z.string().max(METADATA_FIELD_MAX_LENGTH).optional(),
  client_id: z.string().max(CLIENT_ID_MAX_LENGTH).optional(),
  redirect_uri: z.string().max(REDIRECT_URI_MAX_LENGTH).optional(),
  code_challenge: z.string().max(CODE_CHALLENGE_MAX_LENGTH).optional(),
  code_challenge_method: z.string().max(METADATA_FIELD_MAX_LENGTH).optional(),
  state: z.string().max(STATE_MAX_LENGTH).optional(),
  scope: z.string().max(SCOPE_MAX_LENGTH).optional(),
  resource: z.string().max(REDIRECT_URI_MAX_LENGTH).optional(),
});

export type AuthorizationQuery = z.infer<typeof authorizationQuerySchema>;

export const consentDecisionSchema = authorizationQuerySchema.extend({
  decision: z.enum(['allow', 'deny']),
});

export const tokenRequestSchema = z.object({
  grant_type: z.string().max(METADATA_FIELD_MAX_LENGTH),
  client_id: z.string().max(CLIENT_ID_MAX_LENGTH).optional(),
  code: z.string().max(OPAQUE_TOKEN_MAX_LENGTH).optional(),
  redirect_uri: z.string().max(REDIRECT_URI_MAX_LENGTH).optional(),
  code_verifier: z
    .string()
    .min(CODE_VERIFIER_MIN_LENGTH)
    .max(CODE_VERIFIER_MAX_LENGTH)
    .regex(CODE_VERIFIER_PATTERN)
    .optional(),
  refresh_token: z.string().max(OPAQUE_TOKEN_MAX_LENGTH).optional(),
  scope: z.string().max(SCOPE_MAX_LENGTH).optional(),
  resource: z.string().max(REDIRECT_URI_MAX_LENGTH).optional(),
});

export type TokenRequest = z.infer<typeof tokenRequestSchema>;

export const revocationRequestSchema = z.object({
  token: z.string().min(1).max(OPAQUE_TOKEN_MAX_LENGTH),
  token_type_hint: z.string().max(METADATA_FIELD_MAX_LENGTH).optional(),
  client_id: z.string().max(CLIENT_ID_MAX_LENGTH).optional(),
});

export const assistantGrantIdParamSchema = z.object({ grantId: z.string().uuid() });
