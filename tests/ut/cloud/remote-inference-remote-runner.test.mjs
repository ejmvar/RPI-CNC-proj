import http from 'http';
import RemoteInferenceManager from '../../../modules/cloud/remote-inference-manager.mjs';
import { ModelRegistry } from '../../../modules/cloud/model-registry.mjs';

function startServer(port = 0) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (req.method !== 'POST') return res.end('ok');
      let body = '';
      for await (const chunk of req) body += chunk;
      try {
        const data = JSON.parse(body);
        const inputs = data.inputs || [];
        // respond echoing with index
        const outputs = inputs.map((inp, i) => ({ idx: i, in: inp }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ outputs }));
      } catch (err) {
        res.writeHead(400);
        res.end('bad');
      }
    });

    server.listen(port, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') return reject(new Error('invalid-addr'));
      resolve({ server, port: addr.port });
    });
  });
}

describe('Remote runner (http) integration', () => {
  test('register a remote http runner and infer', async () => {
    const { server, port } = await startServer();

    const registry = new ModelRegistry();
    await registry.register('remote-model', {
      versionId: 'v1',
      meta: {},
      artifact: Buffer.from('x'),
    });
    await registry.promoteVersion('remote-model', 'v1', 'prod');

    const rim = new RemoteInferenceManager({
      modelRegistry: registry,
      batchSize: 2,
      batchTimeoutMs: 20,
    });

    rim.registerRemoteRunner('remote-model', 'v1', {
      type: 'http',
      endpoint: `http://127.0.0.1:${port}/infer`,
    });

    const r = await rim.infer({
      modelId: 'remote-model',
      versionId: 'v1',
      inputs: { a: 1 },
      requestId: 'req1',
    });
    expect(r.outputs).toEqual({ idx: 0, in: { a: 1 } });

    // cleanup
    server.close();
    await rim.shutdown();
  });
});
