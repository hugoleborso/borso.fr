---
summary: 'A jsdom `File` passed as a `Request` or `fetch` body throws in vitest''s `makeCompatBlob`, so a presigned PUT cannot go through `stubFetch`; mock the upload adapter instead.'
triggers:
  output:
    - 'makeCompatBlob'
---

# A jsdom `File` cannot be a `Request` body under vitest

Logged by PR #410's `fix2-agent` in a pragma site test. The test built a
`File` in jsdom and sent it through `stubFetch` as the body of the presigned
PUT. Building the `Request` threw inside vitest's `makeCompatBlob`, because
the jsdom `File` is not the `Blob` Node's `Request` accepts (inferred).

Mock the upload adapter at its module boundary
(`vi.mock('../../lib/object-upload.adapter')` in `ConcertPublicPagePanel.test.tsx`) and assert what it received. Keep
`stubFetch` for JSON bodies.
