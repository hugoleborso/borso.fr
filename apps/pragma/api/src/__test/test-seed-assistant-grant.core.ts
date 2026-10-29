export interface SeedAssistantGrant {
  readonly clientName: string;
  readonly redirectUri: string;
  readonly memberFirstName: string;
  readonly lastUsedMinutesAgo: number;
}

export const SEED_ASSISTANT_GRANT: SeedAssistantGrant = {
  clientName: 'Claude Code',
  redirectUri: 'http://127.0.0.1/callback',
  memberFirstName: 'Hugo',
  lastUsedMinutesAgo: 2,
};
