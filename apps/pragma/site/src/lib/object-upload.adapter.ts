/**
 * The browser's way out of the page: a byte transfer straight to a presigned
 * URL, so no chart passes through the API. Per ADR-0012 an outbound call lives
 * in an `.adapter.ts` and nowhere else, which is why the `fetch` a component
 * used to make sits here.
 *
 * @DependsOnExternal aws-s3
 */

/**
 * @Blueprint adapter-direct-upload
 * @BlueprintName Adapter For A Direct Upload
 * @BlueprintUsage Use when the browser sends bytes to a storage service rather than to the application's own API.
 * @BlueprintDescription Takes the presigned URL the API returned and the file, and answers whether the transfer was accepted rather than returning the Response, so the caller holds a named result and never reads a status code. The content type is read off the file rather than passed in, because the presign was signed against that same value and a mismatch is a rejection the caller cannot recover from.
 */
export async function hasSentFileToPresignedUrl(uploadUrl: string, file: File): Promise<boolean> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  return response.ok;
}
