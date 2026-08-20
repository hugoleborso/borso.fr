/**
 * The document every architecture page is served as.
 *
 * The renderers below build a body: a title, some styles, the markup. What
 * they did not build was a document — no doctype, no charset, no viewport —
 * and each of those three absences has a reader who pays for it.
 *
 * Without a doctype the browser parses in quirks mode. Without a charset the
 * page renders as whatever the server's header says, so the same bytes read
 * correctly from GitHub Pages, which sends `charset=utf-8`, and as mojibake
 * from a host that sends a bare `text/html` — which is what `aws s3 sync`
 * sets from the file extension. Without a viewport a phone lays the page out
 * at 980 CSS pixels and scales the result down to the screen, which is why a
 * map that reflows perfectly at 375 pixels still arrives unreadable.
 *
 * The title is lifted out of the body and into the head, because a `<title>`
 * is only a document's title where it belongs. Styles stay where they are:
 * `<style>` in the body is valid, and moving them would mean parsing the
 * body rather than reading its first tag.
 */

const TITLE_TAG = /<title>([\s\S]*?)<\/title>\s*/;

const DEFAULT_TITLE = 'Architecture';

/** Everything before the body, given the title the body carried. */
function renderHead(title: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${title}</title>
</head>
<body>`;
}

// @FollowsBlueprint utils-pure-module
export function wrapInDocumentShell(body: string): string {
  const titleMatch = TITLE_TAG.exec(body);
  const title = titleMatch === null ? DEFAULT_TITLE : titleMatch[1];
  return `${renderHead(title)}
${body.replace(TITLE_TAG, '').trim()}
</body>
</html>
`;
}
