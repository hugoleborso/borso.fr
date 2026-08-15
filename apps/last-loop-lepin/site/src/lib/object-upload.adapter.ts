/**
 * The browser's way out of the page: a byte transfer straight to a presigned
 * URL, so no photo passes through the API. Per ADR-0012 an outbound call lives
 * in an `.adapter.ts` and nowhere else, which is why the `fetch` a hook used to
 * make sits here.
 *
 * @DependsOnExternal aws-s3
 */

// @FollowsBlueprint adapter-direct-upload
/**
 * The HTTP status the storage service answered with, so the caller can put it
 * in the error it raises. `null` means the transfer was accepted.
 */
export async function sendFileToPresignedUrl(
  uploadUrl: string,
  file: File,
  contentType: string,
): Promise<number | null> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': contentType },
    body: file,
  });
  return response.ok ? null : response.status;
}
