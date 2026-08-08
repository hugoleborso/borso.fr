# `/visual-validation` is for feature gates, not single-fix iteration

## The operator rule

`/visual-validation` is a heavy skill. It:

- Spawns a standalone `visual-validator` Agent in a fresh context,
- Reads the full feature `spec.md`,
- Builds an assertion list from every claim in the spec,
- Runs each assertion against the live app (multiple viewports,
  multiple states),
- Captures evidence into a committed `validation/visual-validation-<ts>/`
  folder,
- Writes a verdict report (PASS / PASS_EXCEPT_UNVERIFIABLE / FAIL),
- Runs the broken-image pixel-content check on every screenshot,
- Costs minutes of agent time and tokens.

Use it at the gate-5 milestone of `/technical-conception` when the
whole feature is supposed to be done. Don't use it to confirm a
single CSS tweak landed.

## When to use `agent-browser` directly instead

For an iterative fix — "I changed three lines of CSS, did it still
break?" — the main session can use `agent-browser` straight from
`Bash` and get the answer in <30 seconds without spawning anything:

```bash
agent-browser open http://localhost:5173/ \
  --executable-path /opt/pw-browsers/chromium-1194/chrome-linux/chrome
agent-browser set viewport 1440 900
agent-browser wait --load networkidle
agent-browser screenshot /tmp/spectator.png
```

Then `Read /tmp/spectator.png` and inspect with eyes. Done.

This is the right tool when:

- The fix is isolated (one component, one CSS rule, one selector).
- The user has just flagged a specific layout bug.
- You want to confirm a hypothesis ("the chip should now be round")
  before committing.
- You're inside an active session where re-running the full feature
  spec would re-do work already known-good.

## Rule of thumb

> If you're answering *"is **this one thing** fixed?"*, use
> `agent-browser`. If you're answering *"is the **whole feature**
> shipped per spec?"*, invoke `/visual-validation`.

## Origin

Hugo flagged this verbatim during PR #12: *"When you are doing just
one fix, you should just simply use agent browser to validate this
fix"*. The session was spawning the full `visual-validator` agent
for a CSS one-liner (avatar chips not being circles), which the
operator could see as wasteful given the size of the fix vs the cost
of the skill.

## See also

- [`agent-browser-cli-quirks.md`](./agent-browser-cli-quirks.md) —
  daemon / executable-path notes when running locally.
- `.claude/skills/visual-validation/SKILL.md` — the full skill's
  brief, for when you *do* need the heavy gate.
