exports.handler = async (event) => {
  const response = event.Records[0].cf.response;

  // 🎯 HEADERS DE SEGURIDAD
  response.headers['x-content-type-options'] = [{ key: 'X-Content-Type-Options', value: 'nosniff' }];
  response.headers['x-frame-options'] = [{ key: 'X-Frame-Options', value: 'DENY' }];
  response.headers['x-xss-protection'] = [{ key: 'X-XSS-Protection', value: '1; mode=block' }];
  response.headers['referrer-policy'] = [{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }];
  response.headers['permissions-policy'] = [{ key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' }];

  // 🎯 CORS HEADERS PARA API GATEWAY
  response.headers['access-control-allow-origin'] = [{ key: 'Access-Control-Allow-Origin', value: '*' }];
  response.headers['access-control-allow-methods'] = [{ key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' }];
  response.headers['access-control-allow-headers'] = [{ key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With' }];
  response.headers['access-control-allow-credentials'] = [{ key: 'Access-Control-Allow-Credentials', value: 'true' }];

  // 🎯 CACHE CONTROL PARA ASSETS
  if (response.status === '200' && event.Records[0].cf.request.uri.includes('assets/')) {
    response.headers['cache-control'] = [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }];
  }

  return response;
};
