/**
 * CloudFront Function (viewer-request) that maps preview hostnames to S3 key
 * prefixes inside the shared previews bucket.
 *
 * Host header conventions (must mirror src/internal/naming.ts):
 *   <app>-pr-<n>.preview.borso.fr            -> /<app>/pr-<n>/...
 *   bp-integ-<app>-pr-<n>.preview.borso.fr   -> /bp-integ/<app>/pr-<n>/...
 *
 * The function is deployed once by infra/shared/. It is a CloudFront Function
 * (not Lambda@Edge) for cost + latency.
 *
 * @beta
 */
export const HOST_ROUTING_FUNCTION_CODE = `function handler(event) {
  var request = event.request;
  var host = request.headers.host && request.headers.host.value;
  if (!host) {
    return { statusCode: 400, statusDescription: 'Bad Request' };
  }

  // strip parent domain ".preview.borso.fr"
  var parent = '.preview.borso.fr';
  var idx = host.indexOf(parent);
  if (idx === -1) {
    return { statusCode: 404, statusDescription: 'Not Found' };
  }
  var sub = host.substring(0, idx);

  // sub is one of:
  //   <app>-pr-<n>
  //   bp-integ-<app>-pr-<n>
  var prefix = '';
  if (sub.indexOf('bp-integ-') === 0) {
    prefix = 'bp-integ/';
    sub = sub.substring('bp-integ-'.length);
  }

  // split off "-pr-<n>" suffix
  var prMatch = sub.match(/^(.+)-pr-(\\d+)$/);
  if (!prMatch) {
    return { statusCode: 404, statusDescription: 'Not Found' };
  }
  var app = prMatch[1];
  var pr = prMatch[2];

  var uri = request.uri;
  if (uri === '' || uri.charAt(uri.length - 1) === '/') {
    uri = uri + 'index.html';
  }

  request.uri = '/' + prefix + app + '/pr-' + pr + uri;
  return request;
}
`;
