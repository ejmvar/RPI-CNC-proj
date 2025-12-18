import RemoteInferenceManager from '../../../modules/cloud/remote-inference-manager.mjs';
import { ModelRegistry } from '../../../modules/cloud/model-registry.mjs';

describe('Remote runner (grpc) integration (mock)', () => {
  test('register a GRPC runner via mockCall and infer', async () => {
    const registry = new ModelRegistry();
    await registry.register('grpc-model', {
      versionId: 'v1',
      meta: {},
      artifact: Buffer.from('g'),
    });
    await registry.promoteVersion('grpc-model', 'v1', 'prod');

    const rim = new RemoteInferenceManager({
      modelRegistry: registry,
      batchSize: 2,
      batchTimeoutMs: 20,
    });

    // mockCall simulates a gRPC remote call
    const mockCall = async (inputs) => inputs.map((inp, i) => ({ grpcIdx: i, in: inp }));

    rim.registerRemoteRunner('grpc-model', 'v1', { type: 'grpc', mockCall });

    const r = await rim.infer({
      modelId: 'grpc-model',
      versionId: 'v1',
      inputs: { b: 7 },
      requestId: 'req1',
    });
    expect(r.outputs).toEqual({ grpcIdx: 0, in: { b: 7 } });

    await rim.shutdown();
  });
});
