# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps the archived
copy in a new conversation after the merge, classifies each line, and designs
the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored. Before the pull request opens, run
`scripts/kaizen.sh archive <docs-slug>/<feature>` and commit the copy.

Session: 3d0f35c1-8d0e-4710-8803-383b3ffe9c1a

- [2026-11-27 14:31] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt (where: Bash files=$(git diff --name-only; git ls-files --others --exclude-standard apps/pragma); echo "$files"; pnpm exec prettier --check $files 2>&1 | tail -8; cd apps/pragma && timeout 300 pnpm exec vitest run)
- [2026-11-27 14:32] `impl` exited 1 with no message printed when only the default agent-browser session was open (no 'phone' session started) (where: scripts/phone.sh touch 'text=Visitor QR code')
- [2026-11-27 14:42] `validator` printed 'No test files found, exiting with code 0' on a site-only diff; the validator rule says a run naming no test file is not a pass (where: pnpm --filter @borso-app/pragma run test:e2e --changed <base>)
- [2026-11-27 14:42] `validator` no organism blueprint for a button that owns a sheet's open state; VisitorQrCodeAction.tsx:18 claims organism-presentational, whose row says it owns no state (where: .claude/skills/blueprint/blueprint-index.md organism rows)
- [2026-11-27 14:48] `validator2` coverage table prints All files 0/0 Unknown% when only a test file changed since the base (where: pnpm --filter @borso-app/pragma exec vitest run --project core --changed <sha> --coverage)
- [2026-11-27 14:49] `hook:visual-validation` opened a pull request changing a front end without a visual-validation report (where: mcp__github__create_pull_request)
- [2026-11-27 14:54] `visual` no QR decoder available: BarcodeDetector absent in Chromium, no zbarimg, no cv2; decoded by re-encoding candidates with qrcode.react and comparing the SVG path (where: agent-browser eval BarcodeDetector on http://localhost:5174/app)
- [2026-11-27 14:54] `visual` the first grep match was the root generic node whose name contains the button text; clicking its ref opened the Edit task sheet instead (where: agent-browser snapshot -i | grep 'Visitor QR' on /app)
- [2026-11-27 14:54] `visual` buffer already held exactly 250 entries after one navigation under Vite; had to setResourceTimingBufferSize and clear before measuring (where: performance.getEntriesByType('resource') on /app)
- [2026-11-27 15:00] `visual2` No QR decoder in the sandbox (BarcodeDetector undefined, no zbarimg, no cv2, no pyzbar); QR content checked by re-encoding with qrcode.react instead (where: agent-browser eval 'typeof BarcodeDetector'; which zbarimg)
- [2026-11-27 15:00] `visual2` Seed holds no practice session; validating 'a practice has no Public page tab' required creating one in the dev DB (where: http://localhost:5174/sessions (Upcoming))
