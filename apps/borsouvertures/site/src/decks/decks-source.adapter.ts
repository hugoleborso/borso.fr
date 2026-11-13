// @FollowsBlueprint adapter-external-service
export async function fetchDecksDocument(url: string): Promise<unknown> {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
