import RemoteInferenceManager from '../../../modules/cloud/remote-inference-manager.mjs';
import { ModelRegistry } from '../../../modules/cloud/model-registry.mjs';

describe('RemoteInferenceManager (MVP)', () => {
  test('routes to registered runner and batches by size', async () => {
    const registry = new ModelRegistry();
    await registry.register('m1', { versionId: 'v1', meta: {}, artifact: Buffer.from('a') });
    await registry.promoteVersion('m1', 'v1', 'prod');

    const rim = new RemoteInferenceManager({
      modelRegistry: registry,
      batchSize: 2,
      batchTimeoutMs: 100,
      allowNonProd: false,
    });

    // simple runner: echoes inputs with id
    rim.registerLocalRunner('m1', 'v1', async (inputs) => {
      // simulate small processing
      await new Promise((r) => setTimeout(r, 5));
      return inputs.map((i) => ({ echo: i }));
    });

    const p1 = rim.infer({ modelId: 'm1', versionId: 'v1', inputs: { x: 1 }, requestId: 'r1' });
    const p2 = rim.infer({ modelId: 'm1', versionId: 'v1', inputs: { x: 2 }, requestId: 'r2' });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.outputs).toEqual({ echo: { x: 1 } });
    expect(r2.outputs).toEqual({ echo: { x: 2 } });

    const metrics = rim.getMetrics();
    expect(metrics.totalRequests).toBe(2);
    expect(metrics.totalBatches).toBe(1);
  });

  test('times out and dispatches batch if not filled', async () => {
    const registry = new ModelRegistry();
    await registry.register('m2', { versionId: 'v1', meta: {}, artifact: Buffer.from('b') });
    await registry.promoteVersion('m2', 'v1', 'prod');

    const rim = new RemoteInferenceManager({
      modelRegistry: registry,
      batchSize: 3,
      batchTimeoutMs: 20,
      allowNonProd: false,
    });

    rim.registerLocalRunner('m2', 'v1', async (inputs) => inputs.map((i) => ({ ok: i })));

    const p1 = rim.infer({ modelId: 'm2', versionId: 'v1', inputs: { y: 9 }, requestId: 'r1' });
    const res = await p1;
    expect(res.outputs).toEqual({ ok: { y: 9 } });
    const metrics = rim.getMetrics();
    expect(metrics.totalBatches).toBe(1);
    expect(metrics.totalRequests).toBe(1);
  });

  test('rejects when runner not registered', async () => {
    const registry = new ModelRegistry();
    await registry.register('m3', { versionId: 'v1', meta: {}, artifact: Buffer.from('c') });
    await registry.promoteVersion('m3', 'v1', 'prod');

    const rim = new RemoteInferenceManager({
      modelRegistry: registry,
      batchSize: 2,
      batchTimeoutMs: 100,
      allowNonProd: false,
    });

    await expect(rim.infer({ modelId: 'm3', versionId: 'v1', inputs: {} })).rejects.toThrow(
      'RunnerNotFound'
    );
  });

  test('rejects when model/version not production (unless allowed)', async () => {
    const registry = new ModelRegistry();
    await registry.register('m4', { versionId: 'v1', meta: {}, artifact: Buffer.from('d') });
    // not promoted

    const rim = new RemoteInferenceManager({
      modelRegistry: registry,
      batchSize: 2,
      batchTimeoutMs: 100,
      allowNonProd: false,
    });
    await expect(rim.infer({ modelId: 'm4', versionId: 'v1', inputs: {} })).rejects.toThrow(
      'VersionNotProduction'
    );

    const rim2 = new RemoteInferenceManager({
      modelRegistry: registry,
      batchSize: 2,
      batchTimeoutMs: 100,
      allowNonProd: true,
    });
    rim2.registerLocalRunner('m4', 'v1', async (inputs) => inputs.map((i) => ({ ok: true })));
    const res = await rim2.infer({ modelId: 'm4', versionId: 'v1', inputs: {} });
    expect(res.outputs).toEqual({ ok: true });
  });
});
