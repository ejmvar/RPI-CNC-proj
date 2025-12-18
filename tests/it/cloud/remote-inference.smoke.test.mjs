import RemoteInferenceManager from '../../../modules/cloud/remote-inference-manager.mjs';
import { ModelRegistry } from '../../../modules/cloud/model-registry.mjs';

describe('Remote Inference - integration smoke', () => {
  test('full flow: register -> promote -> register runner -> infer', async () => {
    const registry = new ModelRegistry();

    // register and promote a model version
    await registry.register('smoke-model', {
      versionId: 'v1',
      meta: { foo: 'bar' },
      artifact: Buffer.from('artifact'),
    });
    await registry.promoteVersion('smoke-model', 'v1', 'prod');

    const rim = new RemoteInferenceManager({
      modelRegistry: registry,
      batchSize: 4,
      batchTimeoutMs: 50,
      allowNonProd: false,
    });

    // register a runner which performs a deterministic transform
    rim.registerLocalRunner('smoke-model', 'v1', async (inputs) => {
      return inputs.map((inp) => ({
        sum: Object.values(inp).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0),
      }));
    });

    // perform multiple concurrent inferences to exercise batching
    const promises = [];
    for (let i = 0; i < 4; i++) {
      promises.push(
        rim.infer({
          modelId: 'smoke-model',
          versionId: 'v1',
          inputs: { value: i },
          requestId: `r-${i}`,
        })
      );
    }

    const results = await Promise.all(promises);
    expect(results.length).toBe(4);
    results.forEach((r, i) => {
      expect(r.modelId).toBe('smoke-model');
      expect(r.versionId).toBe('v1');
      expect(r.outputs).toEqual({ sum: i });
      expect(typeof r.metrics.latencyMs).toBe('number');
    });

    const metrics = rim.getMetrics();
    expect(metrics.totalRequests).toBe(4);
    expect(metrics.totalBatches).toBeGreaterThanOrEqual(1);

    // cleanup
    await rim.shutdown();
  });
});
