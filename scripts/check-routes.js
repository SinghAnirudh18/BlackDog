// Simple route status checker (axios-based for Node 16+)
// Usage:
// 1) Start the server: npm run dev (or node server.js)
// 2) node scripts/check-routes.js [baseUrl] [jwt]
//    baseUrl default: http://localhost:3001
//    jwt: optional Bearer token for protected routes

const axios = require('axios');

const base = process.argv[2] || 'http://localhost:3001';
const jwt = process.argv[3] || '';

const headers = (needsAuth = false) => {
  const h = { 'Content-Type': 'application/json' };
  if (needsAuth && jwt) h['Authorization'] = `Bearer ${jwt}`;
  return h;
};

async function hit(method, path, body, needsAuth = false) {
  const url = base + path;
  let status, ok, text;
  try {
    const res = await axios({ method, url, data: body, headers: headers(needsAuth), validateStatus: () => true });
    status = res.status;
    ok = status >= 200 && status < 300;
    text = typeof res.data === 'object' ? JSON.stringify(res.data) : String(res.data);
  } catch (e) {
    status = 'ERR';
    ok = false;
    text = e.message;
  }
  console.log(`${method} ${path} -> ${status} ${ok ? 'OK' : 'FAIL'}\n  Response: ${text.substring(0, 300)}\n`);
}

(async () => {
  console.log(`Checking routes against ${base}`);

  // Health
  await hit('GET', '/health'); // expect 200

  // Public listings
  await hit('GET', '/api/listings'); // expect 200
  await hit('GET', '/api/listings/does-not-exist'); // expect 404

  // Public auth expectations
  // Note: register/login currently redirect/not return token. We only check status codes here.
  await hit('POST', '/api/auth/register', { email: 'x', password: '1', username: 'u' }); // expect 400 validation
  await hit('POST', '/api/auth/login', { email: 'x@example.com', password: 'bad' }); // expect 401
  await hit('GET', '/api/auth/profile', null, true); // expect 200 with JWT, else 401

  // NFT routes
  await hit('POST', '/api/nft/verify-quick', {}); // expect 400 (missing params)
  await hit('POST', '/api/nft/verify', {}, true); // expect 400 with JWT else 401
  await hit('GET', '/api/nft/contract/0x0000000000000000000000000000000000000000/1', null, true); // expect 400 invalid address or 401 without JWT

  // Listings protected routes
  await hit('GET', '/api/listings/my-nfts', null, true); // expect 200 with valid JWT, else 401
  await hit('POST', '/api/listings', {}, true); // expect 400 with JWT else 401
  await hit('PUT', '/api/listings/someid', { price: '0' }, true); // expect 404 with JWT else 401
  await hit('DELETE', '/api/listings/someid', null, true); // expect 404 with JWT else 401
  await hit('GET', '/api/listings/user/my-listings', null, true); // expect 200 with JWT else 401
})();
