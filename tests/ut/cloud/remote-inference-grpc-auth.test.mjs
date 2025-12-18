import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import RemoteInferenceManager from '../../../modules/cloud/remote-inference-manager.mjs';
import { ModelRegistry } from '../../../modules/cloud/model-registry.mjs';
import path from 'path';
import fs from 'fs';

const PROTO_PATH = path.resolve('tests/ut/cloud/fixtures/grpc_auth_test.proto');
fs.mkdirSync(path.dirname(PROTO_PATH), { recursive: true });
fs.writeFileSync(
  PROTO_PATH,
  `syntax = "proto3";
package testpkg;
service TestService {
  rpc Infer (InferRequest) returns (InferResponse);
}
message InferRequest { repeated string inputs = 1; }
message InferOutput { string value = 1; }
message InferResponse { repeated InferOutput outputs = 1; }
`
);

function startGrpcServer(port = 0, options = {}) {
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
      // verify metadata
      const auth = call.metadata.get('authorization')[0];
      const apiKey = call.metadata.get('x-api-key')[0];
      if (options.expectAuth && auth !== options.expectAuth) {
        return cb({ code: grpc.status.UNAUTHENTICATED, message: 'missing auth' });
      }
      if (options.expectApiKey && apiKey !== options.expectApiKey) {
        return cb({ code: grpc.status.PERMISSION_DENIED, message: 'missing api key' });
      }

      const inputs = call.request && call.request.inputs ? call.request.inputs : [];
      const outputs = inputs.map((i, idx) => ({ value: `out_${idx}_${i}` }));
      cb(null, { outputs });
    },
  });

  return new Promise((resolve, reject) => {
    server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (err, portBound) => {
      if (err) return reject(err);
      server.start();
      resolve({ server, port: portBound });
    });
  });
}

describe('Remote runner (grpc) auth and metadata', () => {
  test('uses bearer token from descriptor.credentials', async () => {
    const { server, port } = await startGrpcServer(0, { expectAuth: 'Bearer secret-token' });

    const registry = new ModelRegistry();
    await registry.register('grpc-auth-model', {
      versionId: 'v1',
      meta: {},
      artifact: Buffer.from('g'),
    });
    await registry.promoteVersion('grpc-auth-model', 'v1', 'prod');

    const rim = new RemoteInferenceManager({
      modelRegistry: registry,
      batchSize: 2,
      batchTimeoutMs: 20,
    });

    rim.registerRemoteRunner('grpc-auth-model', 'v1', {
      type: 'grpc',
      address: `127.0.0.1:${port}`,
      protoPath: PROTO_PATH,
      packageName: 'testpkg',
      serviceName: 'TestService',
      methodName: 'Infer',
      credentials: { bearerToken: 'secret-token' },
    });

    const r = await rim.infer({ modelId: 'grpc-auth-model', versionId: 'v1', inputs: ['a'] });
    expect(r.outputs).toEqual({ value: 'out_0_a' });

    server.forceShutdown();
    await rim.shutdown();
  });

  test('uses metadataProvider to send custom headers', async () => {
    const { server, port } = await startGrpcServer(0, { expectApiKey: 'abc-123' });

    const registry = new ModelRegistry();
    await registry.register('grpc-meta-model', {
      versionId: 'v1',
      meta: {},
      artifact: Buffer.from('g'),
    });
    await registry.promoteVersion('grpc-meta-model', 'v1', 'prod');

    const rim = new RemoteInferenceManager({
      modelRegistry: registry,
      batchSize: 2,
      batchTimeoutMs: 20,
    });

    rim.registerRemoteRunner('grpc-meta-model', 'v1', {
      type: 'grpc',
      address: `127.0.0.1:${port}`,
      protoPath: PROTO_PATH,
      packageName: 'testpkg',
      serviceName: 'TestService',
      methodName: 'Infer',
      metadataProvider: async () => ({ 'x-api-key': 'abc-123' }),
    });

    const r = await rim.infer({ modelId: 'grpc-meta-model', versionId: 'v1', inputs: ['b'] });
    expect(r.outputs).toEqual({ value: 'out_0_b' });

    server.forceShutdown();
    await rim.shutdown();
  });
});
