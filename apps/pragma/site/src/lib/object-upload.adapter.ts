/**
 * @DependsOnExternal aws-s3
 * @Feature uploads
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
