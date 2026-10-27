---
summary: 'talos has two contracts and neither is under docs/: apps/talos/CONTRAT.md is the PWA API and the file formats, apps/talos/MEMORY-CONTRACT.md is the frozen memory API behind `talos.py contexte`. "Contrat API mémoire" names the second.'
triggers:
  output:
    - 'contrat-api-memoire'
    - 'contrat-api-m.moire'
  commands:
    - 'docs/contrat'
---

# talos has two contracts

The owner writes requests in French and names documents by what they are, not by their path. Two of the names point at talos files that sit in `apps/talos/`, not in `docs/`:

| What the owner says | File | What it holds |
| --- | --- | --- |
| « le contrat », « le contrat de la PWA » | [`apps/talos/CONTRAT.md`](../../apps/talos/CONTRAT.md) | the private repository's file formats, the PWA routes under `/api/*` (`/today`, `/commitments`, …), and the screens |
| « le contrat API mémoire », « l'endpoint contexte » | [`apps/talos/MEMORY-CONTRACT.md`](../../apps/talos/MEMORY-CONTRACT.md) | the `memory_*` tables and the agent API under `/api/agent/*`, which `talos.py` calls; `talos.py contexte` is `GET /api/agent/context` |

`MEMORY-CONTRACT.md` is **frozen**: its header says a change to it is a change to every lot (API, PWA, CLI, importer, verifier, skills), so a lot does not change it. When a request would change what it says, such as the order of `## Engagements ouverts` in `/context`, report the need to the owner instead of editing it.

## What it cost

On PR #203 the request asked to update `docs/contrat-api-memoire.md` if it described the order of open commitments, and to change "the `contexte` endpoint if it sorts them". The path did not exist, `CONTRAT.md` was updated instead, and `MEMORY-CONTRACT.md`, the file the words described, was never opened. The `/context` endpoint does sort the commitments, by slug (`listCommitments` in `apps/talos/api/src/memory/memory.repository.ts`), so "if it sorts them" was read as "if it sorts them by due date" without asking. Whether `/context` should follow the new order is the owner's call, and it means editing the frozen contract.
