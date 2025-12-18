import RemoteInferenceManager from '../../../modules/cloud/remote-inference-manager.mjs';
import { ModelRegistry } from '../../../modules/cloud/model-registry.mjs';

describe('Remote runner (mq) integration (in-memory)', () => {
  test('register an MQ runner via sendFn and infer', async () => {
    const registry = new ModelRegistry();
    await registry.register('mq-model', { versionId: 'v1', meta: {}, artifact: Buffer.from('mq') });
    await registry.promoteVersion('mq-model', 'v1', 'prod');

    const rim = new RemoteInferenceManager({
      modelRegistry: registry,
      batchSize: 2,
      batchTimeoutMs: 20,
    });

    // simple in-memory MQ send function: echo with count
    const sendFn = async (inputs) => inputs.map((inp, i) => ({ idx: i, in: inp }));

    rim.registerRemoteRunner('mq-model', 'v1', { type: 'mq', sendFn });

    const r = await rim.infer({
      modelId: 'mq-model',
      versionId: 'v1',
      inputs: { a: 9 },
      requestId: 'req1',
    });
    expect(r.outputs).toEqual({ idx: 0, in: { a: 9 } });

    await rim.shutdown();
  });
});
