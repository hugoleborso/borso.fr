# Reading a large pull request through the GitHub MCP

`mcp__github__pull_request_read` with `method: get_files` returns the full
patch for every file, and on a pull request of any size that exceeds the tool
result budget:

```
Error: result (252,876 characters across 1 line) exceeds maximum allowed tokens.
Output has been saved to /root/.claude/projects/…/tool-results/….txt
```

Measured on PR #107: 47 files, 16 of them committed screenshots. `perPage`
does not help much, because the cost is the patches rather than the count, and
paginating turns one refusal into several partial reads.

The result is already on disk as JSON, so read what you need out of it rather
than re-calling the tool:

```sh
python3 -c "
import json
data = json.load(open('<the saved path>'))
for entry in data:
    print(entry['filename'])
"
```

and for one file's patch:

```sh
python3 -c "
import json
data = json.load(open('<the saved path>'))
for entry in data:
    if entry['filename'].endswith('i18n/en.json'):
        print(entry.get('patch', 'no patch'))
"
```

Do not read the saved file with a text slice and `unicode_escape`: the patches
contain backslashes that decoder chokes on, and it corrupts anything it does
manage to decode. It is JSON, so parse it as JSON.

**Answer the question you actually have.** Most of the time the question is
*does this branch touch the files mine touches*, and the file list alone
answers it. Reach for the patches only for the files that overlap.
