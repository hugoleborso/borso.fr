export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_client_metadata'
  | 'invalid_redirect_uri'
  | 'invalid_grant'
  | 'invalid_target'
  | 'unsupported_grant_type'
  | 'unsupported_response_type'
  | 'access_denied';

export interface AuthorizationServerMetadata {
  readonly issuer: string;
  readonly authorization_endpoint: string;
  readonly token_endpoint: string;
  readonly registration_endpoint: string;
  readonly revocation_endpoint: string;
  readonly response_types_supported: readonly string[];
  readonly grant_types_supported: readonly string[];
  readonly code_challenge_methods_supported: readonly string[];
  readonly token_endpoint_auth_methods_supported: readonly string[];
  readonly revocation_endpoint_auth_methods_supported: readonly string[];
  readonly scopes_supported: readonly string[];
}

export interface ProtectedResourceMetadata {
  readonly resource: string;
  readonly resource_name: string;
  readonly authorization_servers: readonly string[];
  readonly scopes_supported: readonly string[];
  readonly bearer_methods_supported: readonly string[];
}

export interface RegisteredClientInformation {
  readonly client_id: string;
  readonly client_id_issued_at: number;
  readonly client_name: string;
  readonly redirect_uris: readonly string[];
  readonly grant_types: readonly string[];
  readonly response_types: readonly string[];
  readonly token_endpoint_auth_method: 'none';
}

export interface TokenResponse {
  readonly access_token: string;
  readonly token_type: 'Bearer';
  readonly expires_in: number;
  readonly refresh_token: string;
  readonly scope: string;
}

export interface AuthorizationRequest {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly codeChallenge: string;
  readonly state: string | undefined;
}

export interface KnownAssistantClient {
  readonly id: string;
  readonly name: string;
  readonly redirectUris: readonly string[];
}

export interface StoredAuthorizationCode {
  readonly clientId: string;
  readonly memberId: string;
  readonly redirectUri: string;
  readonly codeChallenge: string;
  readonly expiresAt: Date;
}

export interface StoredAssistantGrant {
  readonly id: string;
  readonly clientId: string;
  readonly memberId: string;
  readonly refreshTokenHash: string;
  readonly previousRefreshTokenHash: string | null;
  readonly refreshExpiresAt: Date;
  readonly sessionEpoch: number;
}

export interface AssistantGrantSummary {
  readonly id: string;
  readonly clientName: string;
  readonly createdAt: Date;
  readonly lastUsedAt: Date | null;
}

export type ConsentDecision = 'allow' | 'deny';
