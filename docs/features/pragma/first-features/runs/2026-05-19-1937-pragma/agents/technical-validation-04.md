---
status: PASS
summary: |
  Round-3 technical validation on HEAD 3267f91 (impl tip 283e174).
  All six round-2 technical blockers are closed with quoted evidence:

  - B08 (per-domain layered triad): every domain folder under
    apps/pragma/api/src/ (auth, bars, instruments, members, mastery,
    sessions, setlists, songs, transitions, uploads) ships the full
    <domain>.{controller,service,repository,schema}.ts quartet.
    Controllers pass getDatabase() into services; no inline DB
    queries. .core.ts files live INSIDE their bounded context. — closed.
  - A07/A08 (mastery matrix): MasteryMatrix component mounted on
    /members; scroll-wheel ±1, right-click clear, live row/column
    averages via mastery-matrix.utils.ts. /mastery route removed. — closed.
  - A10/D20 (offline-manifest): GET /api/offline-manifest mounted via
    buildOfflineManifestRouter; sw/manifest.utils.ts pickNextSession
    selects future-earliest with deterministic tie-break; SW pre-caches
    the manifest URLs. 100% per-file gate passes. — closed.
  - A13/D21 (embeds): embed.utils.ts hand-codes 6-provider iframe
    resolution (YouTube/Spotify/Deezer/Vimeo/SoundCloud/Soundslice)
    with plain-link fallback; 100% gated. — closed.
  - A18 (drag handle): SetlistEntryRow exposes a draggable handle
    element with onDragStart/onDrop wiring in SetlistEditor; up/down
    buttons retained as a11y fallback. — closed.
  - A20 (stale bars): bars.core.ts isStale + countStale take now as a
    parameter; never call new Date() inside the .core.ts (only in a
    documentation comment). BarsPage renders staleCount banner +
    per-row badge. — closed.

  Gate results: typecheck 0; biome lint 0 on 152 files; knip 0
  (1 informational hint); test:core 245 passed; back-e2e 51 passed;
  test:coverage 296 passed at per-file 100% on .core/.utils; build
  408 kB JS / 121 kB gzip; synth green for pragma-prod + pragma-cluster.

  Aggregated row counts: A 27 PASS, B 13 PASS, C 8 PASS, D 26 PASS. No
  FAIL, no UNVERIFIABLE. A22 (route shape /sessions/:id vs
  /sessions/:id/setlist) is a PASS-with-note carried from round-2.
artifacts:
  - docs/features/pragma/first-features/validation/technical-validation-2026-05-20-1035.md
next:
  kind: ship
---
