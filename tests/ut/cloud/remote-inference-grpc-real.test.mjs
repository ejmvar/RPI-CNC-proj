import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import RemoteInferenceManager from '../../../modules/cloud/remote-inference-manager.mjs';
import { ModelRegistry } from '../../../modules/cloud/model-registry.mjs';
import path from 'path';

// create a simple proto in memory
const PROTO_PATH = path.resolve('tests/ut/cloud/fixtures/grpc_test.proto');

// write the proto file
import fs from 'fs';
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

function startGrpcServer(port = 0) {
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

describe('Remote runner (grpc) integration (real)', () => {
  test('register a real GRPC runner and infer', async () => {
    const { server, port } = await startGrpcServer();

    const registry = new ModelRegistry();
    await registry.register('grpc-real-model', {
      versionId: 'v1',
      meta: {},
      artifact: Buffer.from('g'),
    });
    await registry.promoteVersion('grpc-real-model', 'v1', 'prod');

    const rim = new RemoteInferenceManager({
      modelRegistry: registry,
      batchSize: 2,
      batchTimeoutMs: 20,
    });

    rim.registerRemoteRunner('grpc-real-model', 'v1', {
      type: 'grpc',
      address: `127.0.0.1:${port}`,
      protoPath: PROTO_PATH,
      packageName: 'testpkg',
      serviceName: 'TestService',
      methodName: 'Infer',
    });

    const r = await rim.infer({
      modelId: 'grpc-real-model',
      versionId: 'v1',
      inputs: ['a'],
      requestId: 'req1',
    });
    expect(r.outputs).toEqual([{ value: 'out_0_a' }]);

    server.forceShutdown();
    await rim.shutdown();
  });
});
