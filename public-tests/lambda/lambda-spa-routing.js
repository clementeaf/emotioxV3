exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const uri = request.uri;

  // 🎯 SPA ROUTING: Redirigir todas las rutas a index.html
  if (!uri.includes('.') && uri !== '/') {
    request.uri = '/index.html';
  }

  // 🎯 MANEJAR RUTAS ESPECÍFICAS
  if (uri.startsWith('/test') || uri.startsWith('/error')) {
    request.uri = '/index.html';
  }

  console.log('[Lambda@Edge] SPA routing:', {
    originalUri: uri,
    newUri: request.uri
  });

  return request;
};
