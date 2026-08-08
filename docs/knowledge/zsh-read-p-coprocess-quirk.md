# `read -rsp "prompt: " var` works in bash, fails in zsh

zsh's `read` reserves `-p <fd>` for _coprocess input_, not for
prompting. The same `read -rsp "Admin PIN: " PIN` line that runs
silently in bash errors in zsh with :

```
read: -p: no coprocess
```

First hit in PR #27 while running an inline copy-paste DSQL seed
snippet on a macOS terminal. The `scripts/seed-admin-pin.sh` shell
script that triggered this is committed at
`scripts/seed-admin-pin.sh` and uses the portable shape below.

## Portable shape (bash + zsh + sh)

```sh
printf 'Admin PIN: '
stty -echo
trap 'stty echo' EXIT INT TERM
IFS= read -r PIN
stty echo
trap - EXIT INT TERM
echo
```

- `printf` emits the prompt to stderr-friendly stdout without
  invoking any flag that zsh would re-interpret.
- `stty -echo` disables terminal echo around the read ; `trap`
  restores it on Ctrl-C so the user's terminal isn't left
  echo-disabled.
- `IFS= read -r` reads one line without word-splitting and
  without backslash interpretation — same semantics as
  `read -r`.

## When `-rsp` is fine

`read -rsp` (bash only) keeps working in any script that
explicitly shebangs `#!/usr/bin/env bash` AND is invoked via
`./script.sh` (so the shebang is honoured). It breaks the moment
the user copy-pastes the code into their interactive shell — which
may well be zsh on macOS, Linux desktops with oh-my-zsh, or
non-default shells generally.

## Rule of thumb

**Any prompt that might be copy-pasted into an interactive shell
must avoid `-p` on `read`.** The portable shape above costs three
extra lines and survives the user's local shell choice.
