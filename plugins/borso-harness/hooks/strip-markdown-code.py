"""Print a markdown document with its code spans and fenced blocks removed.

A hook that greps a document for markup has to tell a use from a mention, and
in prose the mention is nearly always quoted: an entry explaining that a tag is
stripped writes the tag inside backticks. Reading the document with its code
removed leaves only the markup that would actually render.

Reads the document on stdin, writes the stripped document on stdout.
"""

import re
import sys

FENCED_BLOCK = re.compile(r"^[ \t]*(`{3,}|~{3,}).*?^[ \t]*\1[ \t]*$", re.MULTILINE | re.DOTALL)
CODE_SPAN = re.compile(r"(?P<ticks>`+)(?P<code>.+?)(?P=ticks)", re.DOTALL)


def strip_markdown_code(document: str) -> str:
    return CODE_SPAN.sub(" ", FENCED_BLOCK.sub("", document))


if __name__ == "__main__":
    sys.stdout.write(strip_markdown_code(sys.stdin.read()))
