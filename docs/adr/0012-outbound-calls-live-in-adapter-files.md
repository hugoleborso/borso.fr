# ADR-0012: Every outbound call lives in an `.adapter.ts` file

- **Status:** proposed
- **Date:** 2026-08-15
- **Deciders:** Hugo Borsoni
- **Tags:** meta, architecture-map, backend, frontend

## Context

The architecture map draws an edge from the system to an external system when a
file carries `@DependsOnExternal <id>`. That tag is the one hand-written input on
the whole map that describes code rather than context, and it is hand-written
because nothing in the file tree says where an outbound call is allowed to be.

Today they are wherever the code happened to need one:

| Outbound call | Lives in | Layer |
| ------------- | -------- | ----- |
| S3 presign | `uploads/uploads.repository.ts` | repository |
| MusicBrainz search | `songs/songs.service.ts` | service |
| DSQL signer | `database/client.ts` | database |
| S3 photo upload (last-loop-lepin) | `media/media.s3.ts` | *unknown* |
| Presigned PUT from the browser | `organisms/FileDrop.tsx` | organism |

Five outbound calls, four different layers, and one file whose suffix the layer
table does not recognise at all. Level 1 is therefore only as accurate as
somebody's memory of writing a tag, which is exactly the property the rest of
the map was built to avoid: everywhere else a node's position is read off the
path and cannot drift.

There is a second cost, independent of the diagram. A repository that also
signs S3 URLs cannot be read as "the only file that talks to the database for
this domain", which is what the back-end standard says a repository is. The
outbound call is a different kind of I/O wearing the same layer's name.

`.adapter.ts` already exists in the layer table and already means this on the
front end — `modal-dialog.adapter.ts`, `session-marker.adapter.ts` — where it is
the module that talks to a browser API. Extending it to the back end is giving
one existing name one meaning on both sides rather than inventing a layer.

## Criteria

1. **The map is derivable.** After the change, level 1's edges should fall out of
   the file tree, and the tag should be a label rather than the source of truth.
2. **A violation is caught by a machine, not by review.** A convention that
   depends on an agent having read a document lasts until the first agent that
   has not.
3. **The layer keeps one meaning.** A repository is database access; a service is
   orchestration. Neither should also mean "and sometimes the network".
4. **The change is proportionate.** Five call sites across two applications, and
   whatever tests already cover them.

## Options

### A. Leave it, and rely on `@DependsOnExternal`

No work. The manifest cross-check already fails when a tag names an external
that is not declared, and when a declared external has no tag.

It does not fail when a file makes an outbound call and carries **no tag at
all** — which is the failure that matters, and the one nothing can catch,
because the check has nothing to compare the code against. Fails criteria 1
and 2.

### B. Lint the call, tag stays where it is

An ESLint rule requiring `@DependsOnExternal` on any file that calls `fetch` or
constructs an AWS SDK client. Cheap, and it closes the "forgot the tag" hole.

It leaves the second cost untouched: the repository still does two jobs, and
level 3.5 still shows a third-party edge leaving a repository block. Meets
criterion 2, fails 1 and 3.

### C. `.adapter.ts` as the only place an outbound call may live

Move each call into a sibling `<domain>.adapter.ts`, and add an ESLint rule that
rejects `fetch` and AWS SDK client construction anywhere else. The layer is then
readable from the path, and the map can colour a third-party edge by where it
leaves without consulting a tag.

Costs: five files move, their callers change one import each, and every future
outbound call needs a file rather than a line. That last one is the point —
adding a network dependency should not be a one-line decision.

### D. A `ports/` folder per application

The hexagonal shape: every outbound dependency behind an interface in one
folder, implementations injected. Strongest isolation, and the only option that
also makes the calls swappable in tests without a fetcher parameter.

It is a horizontal aggregator, which this repository's back-end standard
forbids by name: every rule has an owning bounded context, and a `ports/` folder
pulls the S3 call away from `uploads/`. It also buys an abstraction these five
call sites have not asked for. Fails criterion 4.

## Decision

**Option C.** One suffix, `.adapter.ts`, is the only place an outbound call may
be written, on both the back end and the front end. It sits beside the domain
that owns it, so the vertical-slice rule holds, and the layer table already
knows the suffix so the map needs no new category.

An adapter is: the network client, the request shaping, the retry or rate limit
that belongs to that protocol, and the parse of the response into a type the
domain owns. It is not: business rules, database access, or anything a `.core.ts`
should hold.

## Consequences

**Two that are bad, named on purpose:**

- **A file per outbound call, however small.** `presignPutObject` is nine lines
  and now needs its own module and its own test file. For a one-call
  integration this is more ceremony than the call deserves, and it will feel
  like ceremony every time.
- **The rule cannot see everything.** It matches `fetch` and AWS SDK client
  construction. A library that opens a socket some other way — a Postgres
  driver, a websocket client, an SDK not from AWS — passes it. The gate is a
  floor, not a proof, and `database/client.ts` is deliberately exempt because
  the DSQL signer is that shape.

**Good:**

- Level 1's edges become derivable from the tree, and `@DependsOnExternal`
  becomes a label naming *which* system rather than the only evidence that one
  exists.
- `uploads.repository.ts` becomes what its name says.
- `media.s3.ts` in last-loop-lepin, the one file whose suffix resolved to no
  layer, becomes `media.adapter.ts` and lands on the map.
