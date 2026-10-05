"""Print a shell command with its quoted string bodies removed.

Sibling of `strip-heredocs.py`, and for the same reason: a hook that greps a
command for a phrase has to tell an invocation from a mention. Heredocs are the
commonest mention, and a quoted argument is the next one — `echo "never write
git push | tail"` is prose about a command, not the command.

Only the bodies go; the quotes stay, so `git push "origin" | tail` still reads
as a push in a pipeline. Backslash-escaped quotes inside a body are respected,
so an embedded `\"` does not end the span early.

Reads the command on stdin, writes the stripped command on stdout.
"""

import re
import sys

QUOTED = re.compile(r"""'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*\"""", re.DOTALL)


def strip_quoted_strings(command: str) -> str:
    return QUOTED.sub(lambda match: match.group(0)[0] * 2, command)


if __name__ == "__main__":
    sys.stdout.write(strip_quoted_strings(sys.stdin.read()))
