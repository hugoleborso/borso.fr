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
// Targets CloudFront Functions JavaScript runtime 2.0 — supports
// const/let, template literals, arrow functions. infra/shared sets
// the runtime accordingly.

function handler(event) {
  const request = event.request;
  const host = request.headers.host?.value;
  if (!host) {
    return { statusCode: 400, statusDescription: 'Bad Request' };
  }

  // strip parent domain ".preview.borso.fr"
  const parent = '.preview.borso.fr';
  const idx = host.indexOf(parent);
  if (idx === -1) {
    return { statusCode: 404, statusDescription: 'Not Found' };
  }
  let sub = host.substring(0, idx);

  // sub is one of:
  //   <app>-pr-<n>
  //   bp-integ-<app>-pr-<n>
  let prefix = '';
  if (sub.indexOf('bp-integ-') === 0) {
    prefix = 'bp-integ/';
    sub = sub.substring('bp-integ-'.length);
  }

  // split off "-pr-<n>" suffix
  const prMatch = sub.match(/^(.+)-pr-(\d+)$/);
  if (!prMatch) {
    return { statusCode: 404, statusDescription: 'Not Found' };
  }
  const app = prMatch[1];
  const pr = prMatch[2];

  let uri = request.uri;
  if (uri === '' || uri.charAt(uri.length - 1) === '/') {
    uri = `${uri}index.html`;
  }

  request.uri = `/${prefix}${app}/pr-${pr}${uri}`;
  return request;
}
