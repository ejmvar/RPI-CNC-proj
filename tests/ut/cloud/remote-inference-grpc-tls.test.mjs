import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import RemoteInferenceManager from '../../../modules/cloud/remote-inference-manager.mjs';
import { ModelRegistry } from '../../../modules/cloud/model-registry.mjs';
import path from 'path';
import fs from 'fs';

const PROTO_PATH = path.resolve('tests/ut/cloud/fixtures/grpc_test.proto');
const CERT_PATH = path.resolve('tests/ut/cloud/fixtures/grpc_tls_server.cert.pem');
const KEY_PATH = path.resolve('tests/ut/cloud/fixtures/grpc_tls_server.key.pem');

function startGrpcServerTLS(port = 0) {
  const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const grpcObj = grpc.loadPackageDefinition(packageDef).testpkg;

  const server = new grpc.Server();
  server.addService(grpcObj.TestService.service, {
    Infer: (call, cb) => {
      const inputs = call.request && call.request.inputs ? call.request.inputs : [];
      const outputs = inputs.map((i, idx) => ({ value: `tls_out_${idx}_${i}` }));
      cb(null, { outputs });
    },
  });

  const serverCert = fs.readFileSync(CERT_PATH);
  const serverKey = fs.readFileSync(KEY_PATH);

  return new Promise((resolve, reject) => {
    const creds = grpc.ServerCredentials.createSsl(null, [
      {
        cert_chain: serverCert,
        private_key: serverKey,
      },
    ]);

    server.bindAsync('127.0.0.1:0', creds, (err, portBound) => {
      if (err) return reject(err);
      server.start();
      resolve({ server, port: portBound, cert: serverCert });
    });
  });
}

describe('Remote runner (grpc) TLS', () => {
  test('register a TLS GRPC runner and infer', async () => {
    const { server, port, cert } = await startGrpcServerTLS();

    const registry = new ModelRegistry();
    await registry.register('grpc-tls-model', {
      versionId: 'v1',
      meta: {},
      artifact: Buffer.from('g'),
    });
    await registry.promoteVersion('grpc-tls-model', 'v1', 'prod');

    const rim = new RemoteInferenceManager({
      modelRegistry: registry,
      batchSize: 2,
      batchTimeoutMs: 20,
    });

    // register with TLS rootCert so client trusts server (self-signed)
    rim.registerRemoteRunner('grpc-tls-model', 'v1', {
      type: 'grpc',
      address: `127.0.0.1:${port}`,
      protoPath: PROTO_PATH,
      packageName: 'testpkg',
      serviceName: 'TestService',
      methodName: 'Infer',
      credentials: { type: 'tls', rootCert: cert.toString() },
    });

    const r = await rim.infer({ modelId: 'grpc-tls-model', versionId: 'v1', inputs: ['a'] });
    expect(r.outputs).toEqual({ value: 'tls_out_0_a' });

    server.forceShutdown();
    await rim.shutdown();
  });
});
