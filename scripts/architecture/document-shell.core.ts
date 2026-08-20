const TITLE_TAG = /<title>([\s\S]*?)<\/title>\s*/;

const DEFAULT_TITLE = 'Architecture';

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
  const title = TITLE_TAG.exec(body)?.[1] ?? DEFAULT_TITLE;
  return `${renderHead(title)}
${body.replace(TITLE_TAG, '').trim()}
</body>
</html>
`;
}
