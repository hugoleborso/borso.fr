# Claude Code chat attachments are accessible from the session JSONL

## Symptom

User attaches a JPEG, PNG, or video file in chat. The agent — looking at the harness's tool surface — sees no `read_attachment` or equivalent and replies "I can only see a preview of your image; please commit the binary yourself." User pushes back: *"non TU commit ces fichiers toi-même"*.

During PR #11 this happened multiple times: photos for `/12-travaux`, a métro video, and design exports were all delivered as chat attachments. Each one needed to land in `apps/borso-fr/site/public/media/12-travaux/` for the carousel to render.

## What's actually on disk

Two places. The agent has read access to both.

### 1. Files attached as **uploads** (rare — bigger files, e.g. `.mp4`)

```
/root/.claude/uploads/<session-id>/<random-hex>.<ext>
```

Direct binary files. Verifiable with `file <path>`. Copy them straight to wherever they need to live.

```bash
file /root/.claude/uploads/e14374ed-c418-4c62-8729-858f3772b2ad/35b30d3c-bd0cef665da848288e1ceec51dff6b5c.mp4
# ISO Media, MP4 v2 [ISO 14496-14]
cp <src> apps/borso-fr/site/public/media/12-travaux/mars-2026-metro.mp4
```

### 2. Files inlined as **chat images** (most common — phone JPEGs, PNG screenshots)

Encoded inline as base64 in the session's JSONL transcript:

```
/root/.claude/projects/<workspace-slug>/<session-id>.jsonl
```

Each user message that carries images is one JSONL line. The image blocks live at either:

- `entry.message.content[].source.data` — for image-only user messages (`{ "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": "<base64>" } }`).
- `entry.attachment.prompt[].source.data` — for queued-command messages (multiple images sent in one paste).

Decode and write:

```python
import json, base64, pathlib
src = pathlib.Path("/root/.claude/projects/<workspace>/<session>.jsonl")
out_dir = pathlib.Path("<destination>")
images = []
for line in src.read_text().splitlines():
    try: entry = json.loads(line)
    except: continue
    for content in [
        (entry.get("message") or {}).get("content") if isinstance(entry.get("message"), dict) else None,
        (entry.get("attachment") or {}).get("prompt") if isinstance(entry.get("attachment"), dict) else None,
    ]:
        if not isinstance(content, list): continue
        for block in content:
            if isinstance(block, dict) and block.get("type") == "image":
                s = block.get("source") or {}
                if s.get("type") == "base64" and s.get("data"):
                    images.append((s.get("media_type"), s["data"]))

# images is in chronological order — slice the last N for the most recent batch
for (media_type, data), name in zip(images[-N:], filenames):
    (out_dir / name).write_bytes(base64.b64decode(data))
```

Pillow isn't required — the base64 decode gives the original bytes (JPEG, PNG, etc.), preserving the EXIF and dimensions the user uploaded. Add `from PIL import Image, ImageOps` only if you also want to compress / strip EXIF / resize.

## Gotchas

- **Extension ≠ format.** `media_type` is the source of truth. A `image/png` decoded into a `.jpg` filename serves fine but lies to the next reader. Verify with `file` if unsure.
- **Order is chronological, not semantic.** If the user sent four images in one message and labelled them *"the first two are X, the last two are Y"*, the array order matches that labelling. Iterating `images[-4:]` after the user's message gives you the right four.
- **The transcript file grows fast** (~370 KB / image at JPEG). Don't `cat` it in a Bash tool call — that will overflow the agent's context. Slice with `python3`, `jq` against a stream, or filter by `"image/" in line` before parsing.
- **Attachments don't survive the session.** When the project / session ends, the JSONL stays for a while but is not durable. Commit the binaries the first time the user gives them; don't expect to recover them later.

## Why the harness doesn't make this obvious

The tool surface advertises text I/O, not file I/O for attachments. Nothing prevents the agent from reading the JSONL — it's just not advertised, and the agent's instinct is to assume the absence of a tool means the absence of a capability. It doesn't.
