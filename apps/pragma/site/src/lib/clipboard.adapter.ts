/**
 * @Blueprint browser-clipboard-write
 * @BlueprintName Browser Clipboard Write
 * @BlueprintUsage Use for putting text on the clipboard, so a component never touches `navigator.clipboard` itself.
 * @BlueprintDescription Answers whether the write happened instead of throwing, because a denied clipboard permission is an ordinary outcome the caller shows a message for rather than an error that unmounts the tree. The one call to the browser API lives here, which is what lets every component that copies something be tested without a clipboard.
 * @DependsOnExternal browser-clipboard
 */
export async function didCopyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
