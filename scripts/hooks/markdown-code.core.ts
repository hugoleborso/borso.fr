// @FollowsBlueprint utils-pure-module
const FENCED_BLOCK = /(?<=^|\n)[ \t]*(`{3,}|~{3,})[\s\S]*?(?<=^|\n)[ \t]*\1[ \t]*(?=\n|$)/gu;
const CODE_SPAN = /(`+)[\s\S]+?\1/gu;

export function stripMarkdownCode(document: string): string {
  return document.replace(FENCED_BLOCK, '').replace(CODE_SPAN, ' ');
}
