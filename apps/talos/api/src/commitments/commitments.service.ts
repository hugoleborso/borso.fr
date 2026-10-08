import { listContentDirectory, readContentFiles } from '../content/content.service';
import { type Commitment, isCommitmentFile, selectOpenCommitments } from './commitments.core';

const COMMITMENTS_DIRECTORY = 'engagements';

// @FollowsBlueprint service-read-model
export async function listOpenCommitments(): Promise<Commitment[]> {
  const files = (await listContentDirectory(COMMITMENTS_DIRECTORY)).filter(isCommitmentFile);
  return selectOpenCommitments(await readContentFiles(files));
}
