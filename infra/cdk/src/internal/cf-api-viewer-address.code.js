function handler(event) {
  var request = event.request;
  request.headers['x-borso-viewer-address'] = { value: event.viewer.ip };
  return request;
}
