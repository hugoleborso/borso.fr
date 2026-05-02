// CloudFront Function (viewer-request) source code.
//
// Runs on the CloudFront edge runtime, NOT Node — no imports, no
// require, no Node APIs. The construct in cf-host-routing-function.ts
// reads this file at synth time and ships the source as a string.
//
// Host header conventions (must mirror src/internal/naming.ts):
//   <app>-pr-<n>.preview.borso.fr            -> /<app>/pr-<n>/...
//   bp-integ-<app>-pr-<n>.preview.borso.fr   -> /bp-integ/<app>/pr-<n>/...
//
// Targets CloudFront Functions JavaScript runtime 2.0 but written in
// ES5-compatible syntax on purpose: optional chaining and template
// literals are advertised as supported, but in practice the runtime
// has historically been stricter than the docs imply, so we stick to
// var + string concat to avoid FunctionExecutionError surprises.

// biome-ignore lint/correctness/noUnusedVariables: CloudFront Functions runtime requires the entry point be named exactly `handler`. This file is read as a string at synth time, not imported.
function handler(event) {
  var request = event.request;
  var hostHeader = request.headers && request.headers.host;
  if (!hostHeader || !hostHeader.value) {
    return { statusCode: 400, statusDescription: 'Bad Request' };
  }
  var host = hostHeader.value;

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
  var prMatch = sub.match(/^(.+)-pr-([0-9]+)$/);
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
