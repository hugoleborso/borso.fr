function hasNoExtensionOnLastSegment(uri) {
  return uri.lastIndexOf('.') < uri.lastIndexOf('/');
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri === '' || uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
    return request;
  }
  if (hasNoExtensionOnLastSegment(uri)) {
    request.uri = uri + '/index.html';
  }
  return request;
}
