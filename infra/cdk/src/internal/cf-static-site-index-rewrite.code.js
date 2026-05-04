// CloudFront Function (viewer-request) for the per-app prod / preview
// `StaticSite` distribution.
//
// Rewrites directory-style URIs to /<dir>/index.html so subpaths like
// /art/mondrian/ AND /art/mondrian both resolve to the file at
// /art/mondrian/index.html in the S3 origin. CloudFront's
// `defaultRootObject` only covers the apex /, not nested directories.
//
// Runs on the CloudFront edge runtime, NOT Node — no imports, no
// require, no Node APIs. Targets CloudFront Functions JavaScript
// runtime 2.0; ES5 syntax (var + string concat) on purpose, since the
// runtime has historically been stricter than the docs imply.

// biome-ignore lint/correctness/noUnusedVariables: CloudFront Functions runtime requires the entry point be named exactly `handler`. This file is read as a string at synth time, not imported.
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri === '' || uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
    return request;
  }
  // Heuristic: if the last path segment has no '.', treat as a
  // directory and append /index.html. Otherwise pass through (so
  // /style.css, /img/photo.jpg etc. still hit S3 directly).
  var lastSlash = uri.lastIndexOf('/');
  var lastDot = uri.lastIndexOf('.');
  if (lastDot < lastSlash) {
    request.uri = uri + '/index.html';
  }
  return request;
}
