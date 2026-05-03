---
name: visual-validation
description: Run a standalone agent that opens the implemented feature in a real browser and checks, point by point, that every visible and behavioural assertion in the spec actually holds. Use when the user says "/visual-validation", "validate visually", "check the spec is implemented", or as the gate-5 step in a `/technical-conception` plan. Takes a path to `docs/features/<slug>/spec/spec.md` as the only required argument; the skill discovers the dev-server command from the workspace's `package.json`. The validation agent runs in isolation — no chat history, no main-session context — so its verdict is not biased by what the implementer already convinced themselves of. Produces a verdict report at `docs/features/<slug>/spec/visual-validation-<timestamp>.md` and returns PASS / FAIL / PARTIAL. Reads the standard at `.claude/skills/visual-validation/standard.md` before dispatching.
---

# Visual-validation skill

A spec is a list of assertions about what the user will see and how the app will behave. A visual validation **opens the app and checks each assertion**, one by one, in a real browser, by clicking, typing, resizing, navigating. It is the only gate that catches *"the code compiles and the types check, but the feature doesn't actually work"* — the most common failure mode of LLM-shipped UI code.

The canonical standard this skill enforces lives at [`standard.md`](./standard.md).

## The standalone-agent rule

The validation agent runs in **a fresh Agent invocation** with no chat context. This is non-negotiable. The implementer (the main session) has already convinced themselves the feature works; running validation in their context inherits that bias. The validation agent reads only the spec and the running app — nothing else. If it can't be shown a defect, it isn't there.

In Claude Code this means: the skill (running in the main session) calls the `Agent` tool with a self-contained prompt. The prompt carries the spec path, the dev URL, and the report path, and nothing else. It does not summarise what the main session did or believes.

## When to invoke

Invoke when:
- A feature has shipped to a local dev server (or a preview URL) and `spec.md` is present.
- The user asks for `/visual-validation`, "validate the spec", "check it works".
- The `/technical-conception` plan reaches gate 5 (UI work).

Do **not** invoke when:
- There is no spec at `docs/features/<slug>/spec/spec.md`.
- The feature is purely backend / infra (no visible result).
- The dev server isn't running and the workspace has no `dev` script the skill can use.

## How this phase works

1. **Discover the workspace.** Given `docs/features/<slug>/spec/spec.md`, infer which workspace under `apps/` the feature lives in. The slug usually carries the app prefix (`borso-fr-…` → `apps/borso-fr`); fall back to asking the user once if the prefix is ambiguous.
2. **Start the dev server** if it isn't already running. `pnpm --filter <pkg> dev` in the background. Wait for an HTTP 200 on the dev URL.
3. **Build the assertion checklist.** Read `spec.md` and extract one bullet per assertion:
   - Every item under **Result** (typography, layout, colours, copy).
   - Every numbered step in the happy path under **Use cases / edge cases**.
   - Every bullet under **Edge cases** and **Error cases**.
   - Every Q.O.D. row whose decision is user-visible (palette options, default mode, URL behaviour, mobile affordances, accessibility decisions).
4. **Dispatch the validation agent.** Pass it the assertion checklist, the dev URL, the spec path, and the target report path. The agent runs alone.
5. **The agent drives the browser** — Playwright today; agent-browser when available. For each assertion: click / type / resize / navigate as needed, capture a screenshot or action trace as evidence, decide PASS / FAIL / UNVERIFIABLE.
6. **The agent writes the report** to `docs/features/<slug>/spec/visual-validation-<YYYY-MM-DD-HHmm>.md`.
7. **The skill (main session) reads the report**, summarises the verdict for the user, and points at any FAIL or UNVERIFIABLE rows.

## Deliverable

A markdown report at `docs/features/<slug>/spec/visual-validation-<timestamp>.md`. The report is the artefact; the skill's textual return is a one-line summary. Report format mirrors [`template.md`](./template.md).

The report **must** end with one of:
- `## Verdict: PASS` — every assertion verified.
- `## Verdict: PARTIAL` — at least one UNVERIFIABLE row, no FAIL rows. Implementer can decide if the unverifiable ones are blockers.
- `## Verdict: FAIL` — at least one FAIL row. Implementation is not ready for push.

## Operating mode (skill, in the main session)

```
1. Parse args → spec_path = docs/features/<slug>/spec/spec.md
2. Slug = parent of "spec/" → app_pkg = "@borso-app/<slug-app-prefix>"
3. Probe http://localhost:5173 — running? skip step 4.
4. Spawn `pnpm --filter <app_pkg> dev` in background, wait for 200.
5. Read spec_path, extract assertions (Result + Use cases + Q.O.D. user-visible).
6. Build report_path = docs/features/<slug>/spec/visual-validation-<timestamp>.md
7. Agent({
     subagent_type: "general-purpose",
     description: "Visual validation against spec",
     prompt: `<self-contained brief — see template.md>`,
   })
8. Read the report file, surface PASS / PARTIAL / FAIL summary to user.
9. Stop the background dev server if we started it.
```

## Operating mode (validation agent, dispatched)

The agent receives a self-contained prompt. It does **not** see this conversation. It does not see the spec author's intent. It sees:
- The spec file.
- The dev URL.
- The report path to write.
- The list of assertions to check (extracted by the skill in step 5).
- Tooling: Playwright (or agent-browser equivalent), Read, Write, Bash for screenshot saving.

For each assertion:
1. Plan the browser action that would prove the assertion (e.g. "set window to 380×800, navigate to `/art/mondrian/`, screenshot the frame").
2. Execute it.
3. Compare the observation against the assertion. If the comparison is mechanical (presence of text, attribute value, URL match), it's deterministic. If it requires visual judgement (typography matches the design), capture a screenshot and judge directly.
4. Tag the row PASS / FAIL / UNVERIFIABLE with a one-line evidence reference.

The agent writes the report and exits. It does not ask the user questions; it does not request clarification. If an assertion is ambiguous, the agent tags it UNVERIFIABLE with a note explaining what's missing.

## Failure modes to avoid

- **Optimism leak.** The skill must not pre-summarise the implementation for the agent ("the feature is mostly working, just check…"). Pass the spec and the URL; nothing else. The whole point is unbiased eyes.
- **Flaky-animation pseudo-failures.** Animations driving rAF will produce different pixels every frame. Agent must wait for `networkidle` + an explicit settle delay before screenshotting, and use deterministic seeds (e.g. URL `?seed=DEADBEEF`) where the spec supports it.
- **"Looks right" without evidence.** Every PASS must reference a captured screenshot or a deterministic check (selector found, attribute equal, URL matches). "Looks right" alone is not a PASS.
- **Validating against the implementation, not the spec.** The agent reads the spec to know what to check. If a feature exists in code but isn't claimed in the spec, it isn't validated. If a claim is in the spec but missing from the code, that's a FAIL — never a "well, the implementer probably meant…".
- **Skipping edge cases because they're hard.** "<380 px" requires resizing. "prefers-reduced-motion" requires `page.emulateMedia({ reducedMotion: 'reduce' })`. Reduced motion + dark mode + small viewports are exactly the cases users hit; these are the ones the agent must check, not the ones it can.
- **Treating UNVERIFIABLE as PASS.** The verdict downgrades to PARTIAL when any row is UNVERIFIABLE. Surface them.

## Repo-specific notes

- Workspaces live under `apps/<slug>/`. The dev server is started via `pnpm --filter @borso-app/<slug> dev`.
- Default dev port is 5173 unless the workspace's `vite.config.ts` overrides it. Detect by reading the config or polling.
- The borso-fr workspace already ships Playwright as a dev dep and a screenshot script at `apps/borso-fr/scripts/screenshot.mjs` — reuse the agent's setup pattern.
- Reports go in `docs/features/<slug>/spec/` (next to the spec, per the spec skill's "additional documents" rule).
- When the report verdict is FAIL, the user is shown the failing rows verbatim and given the option to re-run validation after fixes, not asked to interpret the report themselves.
