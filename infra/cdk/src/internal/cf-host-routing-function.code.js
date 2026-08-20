var PREVIEW_PARENT_DOMAIN = '.preview.borso.fr';
var INTEG_HOST_PREFIX = 'bp-integ-';
var INTEG_KEY_PREFIX = 'bp-integ/';
var PULL_REQUEST_SUBDOMAIN_PATTERN = /^(.+)-pr-([0-9]+)$/;
var SINGLE_PAGE_APPS = ['last-loop-lepin', 'pragma'];
var BAD_REQUEST = { statusCode: 400, statusDescription: 'Bad Request' };
var NOT_FOUND = { statusCode: 404, statusDescription: 'Not Found' };

function isSinglePageApp(app) {
  for (var index = 0; index < SINGLE_PAGE_APPS.length; index++) {
    if (SINGLE_PAGE_APPS[index] === app) {
      return true;
    }
  }
  return false;
}

function hasNoExtensionOnLastSegment(uri) {
  return uri.lastIndexOf('.') < uri.lastIndexOf('/');
}

function handler(event) {
  var request = event.request;
  var hostHeader = request.headers && request.headers.host;
  if (!hostHeader || !hostHeader.value) {
    return BAD_REQUEST;
  }
  var host = hostHeader.value;

  var parentDomainIndex = host.indexOf(PREVIEW_PARENT_DOMAIN);
  if (parentDomainIndex === -1) {
    return NOT_FOUND;
  }
  var subdomain = host.substring(0, parentDomainIndex);

  var prefix = '';
  if (subdomain.indexOf(INTEG_HOST_PREFIX) === 0) {
    prefix = INTEG_KEY_PREFIX;
    subdomain = subdomain.substring(INTEG_HOST_PREFIX.length);
  }

  var subdomainMatch = subdomain.match(PULL_REQUEST_SUBDOMAIN_PATTERN);
  if (!subdomainMatch) {
    return NOT_FOUND;
  }
  var app = subdomainMatch[1];
  var pullRequestNumber = subdomainMatch[2];
  var keyPrefix = '/' + prefix + app + '/pr-' + pullRequestNumber;

  var uri = request.uri;

  if (isSinglePageApp(app)) {
    if (uri === '' || uri === '/' || hasNoExtensionOnLastSegment(uri)) {
      request.uri = keyPrefix + '/index.html';
    } else {
      request.uri = keyPrefix + uri;
    }
    return request;
  }

  if (uri === '' || uri.charAt(uri.length - 1) === '/') {
    uri = uri + 'index.html';
  } else if (hasNoExtensionOnLastSegment(uri)) {
    uri = uri + '/index.html';
  }

  request.uri = keyPrefix + uri;
  return request;
}
