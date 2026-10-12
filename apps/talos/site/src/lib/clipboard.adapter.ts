/**
 * @DependsOnExternal browser-clipboard
 */

// @FollowsBlueprint browser-clipboard-write
export async function didCopyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
