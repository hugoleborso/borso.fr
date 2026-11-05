"""Print a shell command with its heredoc bodies removed.

A hook that greps a command for a phrase has to tell an invocation from a
mention, and the commonest mention is a heredoc: a commit message, a
documentation edit, a generated file all arrive as text inside the very
command the hook is inspecting. Reading the command with its heredoc bodies
dropped leaves only what a shell would actually execute.

Reads the command on stdin, writes the stripped command on stdout.
"""

import re
import sys

HEREDOC = re.compile(
    r"""<<-?['"]?(?P<tag>[A-Za-z_][A-Za-z0-9_]*)['"]?\n.*?\n(?P=tag)(\n|$)""",
    re.DOTALL,
)


def strip_heredocs(command: str) -> str:
    return HEREDOC.sub("\n", command)


if __name__ == "__main__":
    sys.stdout.write(strip_heredocs(sys.stdin.read()))
