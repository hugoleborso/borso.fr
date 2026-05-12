# Race Dashboard Design

_Started 2026-05-12 00:45 UTC_

---

## User



## Assistant

_[tool: questions_v2]_

## User

Questions answered:
- scope: Admin page (PIN + punch UI), Runner fiche /r/<slug>, Setup d'édition (GPX upload, sunrise/sunset), Hors-jour-J home page, Spectator page (live race view), All of them as a clickable prototype
- language: Bilingual (FR primary, EN labels)
- aesthetic: Explore a few options
- vibe_words: Epic, data first, useful
- hero_element: A 4-up dashboard, all equal
- countdown_style: Try a few options, we need to easily see the true time
- runner_identity: Photo placeholder initials. Runners are shown on the map based on their previous speed (default 45min)
- race_phase: Show several via Tweaks
- variations: 3
- tweaks: Color palette / accent, Layout density, Race phase (timeline scrubber)
- novelty: Conservative — proven sports/dashboard patterns

## Assistant

_[tool: update_todos]_

_[tool: copy_starter_component]_

I'll build this as one clickable prototype with all surfaces wired together, race-phase scrubber + palette + density as Tweaks. Three conservative dashboard directions:
1. **Scoreboard** — broadcast/sports vibe, monospace numerals, dark + vivid accents
2. **Topographic** — cartographic, warm paper, forest-green ink, contour motifs
3. **Telemetry** — cool slate dashboard (think Linear/Cloudflare), single accent

Let me set up the foundation and show you early, then layer in detail.

_[tool: write_file]_

_[tool: write_file]_

Now I'll lay down the foundation: data model, design tokens for the three aesthetics, app shell. Then iterate.

_[tool: snip]_

_[tool: read_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

Now the entry HTML and app shell.

_[tool: snip]_

Now the four spectator panels: countdown (3 styles), leaderboard, eliminated wall, course map with moving runners.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

## Assistant

_[tool: snip]_

_[tool: write_file]_

## Assistant

_[tool: snip]_

Now the course map with runners moving along the GPX, the spectator dashboard combining everything, and a quick first preview.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: snip]_

_[tool: show_html]_

_[tool: snip]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: save_screenshot]_

_[tool: snip]_

_[tool: view_image]_

_[tool: snip]_

_[tool: write_file]_

_[tool: write_file]_

Now the four remaining pages — Admin (punch UI), Runner Fiche, Setup d'édition, Home (hors-jour-J).

_[tool: snip]_

I just broke home.jsx — it needs the real HomePage and the stub fallbacks for runner-fiche/setup. Let me restore + write the real Home, Runner Fiche, and Setup pages.

_[tool: write_file]_

_[tool: write_file]_

_[tool: snip]_

Last page — Setup d'édition (GPX upload, sunrise/sunset readout, runners CRUD).

_[tool: write_file]_

_[tool: show_html]_

_[tool: snip]_

_[tool: get_webview_logs]_

_[tool: snip]_

_[tool: multi_screenshot]_

_[tool: snip]_

_[tool: done]_

_[tool: fork_verifier_agent]_

All five surfaces are wired into one prototype with the three aesthetics, palette, density and race-phase scrubber exposed as Tweaks. Open Tweaks to flip directions or scrub through Pré-course → Mi-journée → Coucher → Nuit → Duel final → Course terminée; nav switches between Home / Spectateur / Fiche / Admin (PIN 4242) / Setup.

_[tool: update_todos]_

_[tool: snip]_

Done — prototype is live at `index.html`.

