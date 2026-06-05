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

  // Apps whose preview is a single-page app (React bundle + client-side
  // routes). Direct nav to a deep route like /login or /catalog must
  // resolve to the SPA's index.html so the in-app router renders the
  // right view. Multi-page apps (borso-fr, borsouvertures) instead want
  // /art/mondrian to map to /art/mondrian/index.html in S3.
  //
  // The CloudFront Function has no S3 awareness, so this list is the
  // only way to disambiguate the two intents. Keep it in sync with the
  // `spaFallback: true` callers of StaticSite in PreviewableApp — every
  // PreviewableApp consumer is an SPA by construction.
  var SPA_APPS = ['last-loop-lepin', 'pragma'];
  var isSpaApp = false;
  for (var spaAppIndex = 0; spaAppIndex < SPA_APPS.length; spaAppIndex++) {
    if (SPA_APPS[spaAppIndex] === app) {
      isSpaApp = true;
      break;
    }
  }

  var uri = request.uri;

  if (isSpaApp) {
    // SPA fallback: any path without a file extension on its last
    // segment is a client-side route — rewrite to the bundle's root
    // index.html so the React router takes over. Asset paths
    // (/assets/foo.js, /favicon.svg, /icon-512.png) keep their extension
    // and pass through to S3 unchanged.
    var lastSlashSpa = uri.lastIndexOf('/');
    var lastDotSpa = uri.lastIndexOf('.');
    if (uri === '' || uri === '/' || lastDotSpa < lastSlashSpa) {
      request.uri = '/' + prefix + app + '/pr-' + pr + '/index.html';
    } else {
      request.uri = '/' + prefix + app + '/pr-' + pr + uri;
    }
    return request;
  }

  // Multi-page mode: rewrite directory-style requests to /<dir>/index.html
  // so nested folders (e.g. /art/mondrian -> /art/mondrian/index.html) work
  // the same as the root does. Heuristic: if the last path segment after
  // the rightmost '/' contains no '.', treat as directory; otherwise pass
  // through (preserves /style.css, /img/photo.jpg, etc).
  if (uri === '' || uri.charAt(uri.length - 1) === '/') {
    uri = uri + 'index.html';
  } else {
    var lastSlash = uri.lastIndexOf('/');
    var lastDot = uri.lastIndexOf('.');
    if (lastDot < lastSlash) {
      uri = uri + '/index.html';
    }
  }

  request.uri = '/' + prefix + app + '/pr-' + pr + uri;
  return request;
}
