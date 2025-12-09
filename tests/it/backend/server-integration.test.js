const { createSimpleHttpServer } = require('../../../modules/backend/server/http-server');
const http = require('http');
const { spawnSync } = require('child_process');
const path = require('path');

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

describe('backend HTTP + CLI integration', () => {
  let server, port;
  beforeAll(() => new Promise((resolve) => { server = createSimpleHttpServer(); server.listen(0, () => { port = server.address().port; resolve(); }); }));
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  test('upload a file via HTTP then run simulate-batch on it', async () => {
    const filename = 'integration-upload.nc';
    const content = 'G1 X0 Y0 Z0\nG1 X5 Y5 Z-1\nG0 X10 Y10 Z5';

    const up = await requestPromise({ hostname: '127.0.0.1', port, path: '/upload', method: 'POST', headers: { 'content-type': 'application/json' } }, JSON.stringify({ filename, content }));
    expect(up.status).toBe(201);
    const body = JSON.parse(up.body);
    expect(body.filename).toBe(filename);

    // run the simulate-batch CLI directly on the stored path
    const r = spawnSync('node', [path.resolve(__dirname, '../../../modules/cli/bin/simulate-batch.js'), body.path], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/commands:/);
  });
});
