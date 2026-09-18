# agent-browser aborts a navigation served as octet-stream

`scripts/browser.sh open http://localhost:8099/` answered:

```
✗ Navigation failed: net::ERR_ABORTED
```

and every follow-up read as though the browser had never left `about:blank`,
because it had not: `document.title` was empty and `document.scripts` was
`[]`.

Nothing was wrong with the browser, the daemon or the sandbox. The local
server under test was answering `/` with `content-type: application/octet-stream`,
because it derived the type from `path.extname('/')`, which is the empty
string. Chromium treats an octet-stream response to a top-level navigation as
a download, not as a page, so it aborts the navigation and leaves the tab
where it was.

The failure points away from the cause in every direction, and this
repository's own notes make it worse rather than better:
[`driving-previews-with-agent-browser-and-argent.md`](./driving-previews-with-agent-browser-and-argent.md)
documents a real trap where a proxy breaks https navigation with
`ERR_CONNECTION_RESET`, so the first guess is the proxy, and stripping
`HTTP_PROXY` and setting `NO_PROXY` changes nothing and looks like a failed
fix rather than a ruled-out cause.

**Check the content type before anything else.** One `curl` names it:

```sh
curl -s -D- -o /dev/null http://localhost:8099/ | head -3
```

If it does not say `text/html`, the browser is behaving correctly and the
server is the thing to fix. `ERR_ABORTED` on a navigation means Chromium
decided the response was not a page; it is not a network error despite the
`net::` prefix.

## See also

- [Driving previews with agent-browser and argent](./driving-previews-with-agent-browser-and-argent.md) for the TLS trap this one is easily mistaken for.
