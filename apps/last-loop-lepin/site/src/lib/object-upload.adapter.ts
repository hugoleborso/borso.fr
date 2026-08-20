/** @DependsOnExternal aws-s3 */
// @FollowsBlueprint adapter-direct-upload
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
