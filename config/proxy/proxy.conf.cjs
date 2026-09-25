// Development only. The local backend profile permits HTTP; never deploy this proxy.
module.exports = {
  '^/api(?:/|\\?|$)': {
    target: 'http://127.0.0.1:8080',
    changeOrigin: false,
    xfwd: false,
    rewrite: (path) => path.replace(/^\/api(?=\/|\?|$)/, '') || '/',
    configure(proxy) {
      proxy.on('proxyReq', (proxyReq, req) => {
        // Never let browser-supplied forwarding headers assert a secure connection.
        for (const name of Object.keys(req.headers)) {
          if (name === 'forwarded' || name.startsWith('x-forwarded-')) {
            proxyReq.removeHeader(name);
          }
        }
        proxyReq.setHeader('X-Forwarded-Proto', req.socket.encrypted ? 'https' : 'http');
        proxyReq.setHeader('X-Forwarded-For', req.socket.remoteAddress);
      });
    },
  },
};
