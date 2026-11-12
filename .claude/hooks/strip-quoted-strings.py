"""Print a shell command with its quoted string bodies removed.

Sibling of `strip-heredocs.py`, and for the same reason: a hook that greps a
command for a phrase has to tell an invocation from a mention. Heredocs are the
commonest mention, and a quoted argument is the next one — `echo "never write
git push | tail"` is prose about a command, not the command.

Only the bodies go; the quotes stay, so `git push "origin" | tail` still reads
as a push in a pipeline. Backslash-escaped quotes inside a body are respected,
so an embedded `\"` does not end the span early.

A body that is one URL and nothing else stays. `curl "https://host/path"` asks
that host for that path whether or not the address is quoted, and a knowledge
entry triggered by a host never printed for the quoted form.

Reads the command on stdin, writes the stripped command on stdout.
"""

import re
import sys

QUOTED = re.compile(r"""'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*\"""", re.DOTALL)


LONE_URL = re.compile(r"""https?://[^\s'"]+""")


def strip_quoted_span(span: str) -> str:
    if LONE_URL.fullmatch(span[1:-1]):
        return span
    return span[0] * 2


def strip_quoted_strings(command: str) -> str:
    return QUOTED.sub(lambda match: strip_quoted_span(match.group(0)), command)


if __name__ == "__main__":
    sys.stdout.write(strip_quoted_strings(sys.stdin.read()))
