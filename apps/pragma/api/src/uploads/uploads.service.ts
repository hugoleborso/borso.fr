/**
 * Service layer for uploads. Holds the prefix constants and routes
 * the controller's request to the repository's minter.
 */

import { type MintedUpload, mintStubUploadKey } from './uploads.repository';

const CHORD_CHART_PREFIX = 'chord-charts';
const AVATAR_PREFIX = 'avatars';

export function mintChordChartUpload(ext: string): MintedUpload {
  return mintStubUploadKey(CHORD_CHART_PREFIX, ext);
}

export function mintAvatarUpload(ext: string): MintedUpload {
  return mintStubUploadKey(AVATAR_PREFIX, ext);
}
