---
summary: 'Wikimedia answers 429 to a cloud session for most Commons files, while a small cached file can answer 200, so one success proves nothing. Ask the operator for the file and log a backlog row; do not retry.'
triggers:
  commands:
    - 'wikimedia\.org'
  output:
    - 'bot-traffic@wikimedia\.org'
---

# Wikimedia rate-limits the session's egress

A cloud session reaches the internet through a shared egress. Wikimedia counts
that egress as one heavy client.

## What was measured

| Date | Request | Answer |
| --- | --- | --- |
| 2026-11-13, PR #324 | `upload.wikimedia.org` and the Commons API, for `File:Didrachm_Phaistos_obverse_CdM.jpg` | 429 on the first try |
| 2026-11-13, sweep of PR #324 | API and upload host, for `File:Example.jpg` | 200 and 200 |
| 2026-11-13, sweep of PR #324 | The Commons API, `prop=imageinfo`, the next request | 429, *You are making too many requests to the API* |
| 2026-11-13, sweep of PR #324 | The direct upload path `commons/c/c8/Didrachm_Phaistos_obverse_CdM.jpg` | 429, a 3.5 kB HTML body saved as `.jpg` |

The sweep sent a descriptive `User-Agent` on the last two requests and still got 429 (measured).

## What to do

- Check the saved file with `file <path>` before using it. A 429 writes HTML under
  the name you asked for.
- Do not loop on retries. Each one keeps the egress on the list.
- Ask the operator for the file, or write a row in `docs/operator-backlog.md`
  naming the file and where it lives. The Talos icon row is the example.
