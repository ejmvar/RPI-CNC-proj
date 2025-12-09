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

describe('HTTP session endpoints', () => {
  let server, port;
  beforeAll(() => {
    server = createSimpleHttpServer();
    return new Promise((resolve) => server.listen(0, () => {
      port = server.address().port;
      resolve();
    }));
  });
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  test('save session via HTTP and load it back', async () => {
    const filename = 'http-session.json';
    const session = { foo: 'bar', idx: 5 };

    const up = await requestPromise({ hostname: '127.0.0.1', port, path: '/session/save', method: 'POST', headers: { 'content-type': 'application/json' } }, JSON.stringify({ filename, session }));
    expect(up.status).toBe(201);

    const dl = await requestPromise({ hostname: '127.0.0.1', port, path: `/session/load/${encodeURIComponent(filename)}`, method: 'GET' });
    expect(dl.status).toBe(200);
    expect(JSON.parse(dl.body)).toEqual(session);
  });
});
