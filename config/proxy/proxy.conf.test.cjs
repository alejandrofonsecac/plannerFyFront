const assert = require('node:assert/strict');
const { test } = require('node:test');
const http = require('node:http');
const { once } = require('node:events');
const config = require('./proxy.conf.cjs');
const [pattern, options] = Object.entries(config)[0];

test('only API paths are proxied and query strings survive rewriting', () => {
  const match = new RegExp(pattern);
  for (const path of ['/api', '/api/users/login', '/api?test=1']) assert.ok(match.test(path));
  for (const path of ['/api-other', '/apiculture', '/users/login']) assert.ok(!match.test(path));
  assert.equal(options.rewrite('/api/users/login?test=1'), '/users/login?test=1');
  assert.equal(options.rewrite('/api'), '/');
});

test('forwarded protocol comes from the socket, never client headers', () => {
  let onRequest;
  options.configure({ on(event, callback) { assert.equal(event, 'proxyReq'); onRequest = callback; } });
  for (const encrypted of [true, false, undefined]) {
    const headers = new Map([
      ['forwarded', 'proto=https'], ['x-forwarded-proto', 'https'],
      ['x-forwarded-for', 'attacker'], ['x-forwarded-host', 'attacker.example'],
    ]);
    onRequest({
      removeHeader: (name) => headers.delete(name.toLowerCase()),
      setHeader: (name, value) => headers.set(name.toLowerCase(), value),
    }, { headers: Object.fromEntries(headers), socket: { encrypted, remoteAddress: '127.0.0.1' } });
    assert.equal(headers.get('x-forwarded-proto'), encrypted ? 'https' : 'http');
    assert.equal(headers.get('x-forwarded-for'), '127.0.0.1');
    assert.ok(!headers.has('forwarded'));
    assert.ok(!headers.has('x-forwarded-host'));
  }
});

test('Vite loads the proxy and forwards requests without trusting spoofed HTTPS', async () => {
  const { createServer } = await import('vite');
  const upstream = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ path: req.url, protocol: req.headers['x-forwarded-proto'],
      session: req.headers['x-plannerfy-session'], forwarded: req.headers.forwarded }));
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  let server;
  try {
    server = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 0,
      proxy: { [pattern]: { ...options, target: `http://127.0.0.1:${upstream.address().port}` } } } });
    await server.listen();
    const response = await fetch(`http://127.0.0.1:${server.httpServer.address().port}/api/users/login?q=1`, {
      method: 'POST', headers: { 'X-Forwarded-Proto': 'https', Forwarded: 'proto=https', 'X-PlannerFy-Session': '1' },
    });
    assert.deepEqual(await response.json(), { path: '/users/login?q=1', protocol: 'http', session: '1' });
  } finally {
    await server?.close();
    await new Promise((resolve) => upstream.close(resolve));
  }
});
