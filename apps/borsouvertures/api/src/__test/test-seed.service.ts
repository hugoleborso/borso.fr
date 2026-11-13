import { hashOperatorPassword } from '../auth/auth.service';
import { OPERATOR_CREDENTIAL_ID, SIGNING_KEY_ID } from '../auth/operator-session.core';
import { storeReviewEvents } from '../review-events/review-events.service';
import {
  buildFixtureReviewEvents,
  FIXTURE_FIRST_SESSION_EPOCH,
  FIXTURE_OPERATOR_PASSWORD,
  FIXTURE_SIGNING_KEY,
} from './test-seed-fixture.core';
import {
  insertOperatorCredentialUnlessStored,
  insertSigningKeyUnlessStored,
} from './test-seed.repository';

export interface SeedSummary {
  readonly operatorPassword: string;
  readonly reviewEvents: number;
}

// @FollowsBlueprint service-orchestration
export async function seedPreviewFixture(now: Date): Promise<SeedSummary> {
  await insertSigningKeyUnlessStored({ id: SIGNING_KEY_ID, hmacKey: FIXTURE_SIGNING_KEY });
  await insertOperatorCredentialUnlessStored({
    id: OPERATOR_CREDENTIAL_ID,
    passwordHash: await hashOperatorPassword(FIXTURE_OPERATOR_PASSWORD),
    sessionEpoch: FIXTURE_FIRST_SESSION_EPOCH,
    createdAt: now,
  });
  const receipts = await storeReviewEvents({ events: buildFixtureReviewEvents(now), now });
  return { operatorPassword: FIXTURE_OPERATOR_PASSWORD, reviewEvents: receipts.length };
}
