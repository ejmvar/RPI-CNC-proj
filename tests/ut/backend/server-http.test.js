const http = require('http');
const { createSimpleHttpServer } = require('../../../modules/backend/server/http-server');

function requestPromise(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('Simple HTTP server (no external deps)', () => {
  let server, port;
  beforeAll(() => {
    server = createSimpleHttpServer();
    return new Promise((resolve) => server.listen(0, () => {
      port = server.address().port;
      resolve();
    }));
  });
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  test('health endpoint', async () => {
    const res = await requestPromise({ hostname: '127.0.0.1', port, path: '/health', method: 'GET' });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'ok' });
  });

  test('upload and download via HTTP', async () => {
    const filename = 'http-test.nc';
    const content = 'G1 X1 Y1 Z0\nG1 X2 Y2 Z-0.5';

    const up = await requestPromise({ hostname: '127.0.0.1', port, path: '/upload', method: 'POST', headers: { 'content-type': 'application/json' } }, JSON.stringify({ filename, content }));
    expect(up.status).toBe(201);

    const dl = await requestPromise({ hostname: '127.0.0.1', port, path: `/download/${encodeURIComponent(filename)}`, method: 'GET' });
    expect(dl.status).toBe(200);
    expect(dl.body).toBe(content);
  });
});
