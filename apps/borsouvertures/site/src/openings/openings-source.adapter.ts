// @FollowsBlueprint adapter-external-service
export async function fetchOpeningsDocument(url: string): Promise<unknown> {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) return null;
    return await response.json();
  } catch (networkError) {
    console.warn('Network openings.json fetch failed; trying bundled fallback', networkError);
    return null;
  }
}
