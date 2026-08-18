/**
 * The one file in this site that leaves the page. Per ADR-0012 an outbound
 * call lives in an `.adapter.ts` and nowhere else, which is why the `fetch`
 * that `loadOpenings.ts` used to make sits here.
 *
 * The dataset is served from this site's own origin rather than a third party,
 * so it carries no `@DependsOnExternal` tag — the boundary being marked is the
 * network, not a vendor.
 */

// @FollowsBlueprint adapter-external-service
/**
 * The openings document as the network returned it, or `null` when there is none.
 *
 * A caller cannot act on the difference between a refusal, a timeout and a
 * malformed response — all three mean "use the bundled copy" — so the three
 * collapse into one absent value here rather than three cases upstream.
 */
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
