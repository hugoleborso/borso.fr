import {
  didDeleteBandLink,
  findBandLinkWithin,
  insertBandLinkOnceWithin,
  listBandLinksOldestFirst,
  runInOneBandLinkTransaction,
} from './band-links.repository';
import type { BandLink, BandLinkCreateInput } from './band-links.schema';

export async function listBandLinks(): Promise<BandLink[]> {
  return await listBandLinksOldestFirst();
}

// @FollowsBlueprint service-orchestration
export async function addBandLink(input: BandLinkCreateInput, now: Date): Promise<BandLink> {
  return await runInOneBandLinkTransaction(async (executor) => {
    await insertBandLinkOnceWithin(executor, { ...input, createdAt: now });
    const bandLink = await findBandLinkWithin(executor, input.id);
    if (bandLink === null) {
      throw new Error('the written band link is not visible to its own transaction');
    }
    return bandLink;
  });
}

export async function didRemoveBandLink(id: string): Promise<boolean> {
  return await didDeleteBandLink(id);
}
