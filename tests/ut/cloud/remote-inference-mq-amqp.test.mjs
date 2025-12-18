import RemoteInferenceManager from '../../../modules/cloud/remote-inference-manager.mjs';
import { ModelRegistry } from '../../../modules/cloud/model-registry.mjs';

// Mock amqplib implementation
const fakeAmqplib = {
  async connect(url) {
    return {
      async createChannel() {
        let consumer;
        return {
          async assertQueue(name, opts) {
            return { queue: 'reply-q' };
          },
          async consume(q, onMsg) {
            consumer = onMsg;
            return Promise.resolve();
          },
          sendToQueue(q, payload, opts) {
            // echo back a response asynchronously
            setTimeout(() => {
              const msg = {
                content: Buffer.from(
                  JSON.stringify({ outputs: [{ res: JSON.parse(payload.toString()).inputs[0] }] })
                ),
                properties: { correlationId: opts.correlationId },
              };
              consumer(msg);
            }, 1);
          },
          async close() {},
        };
      },
      async close() {},
    };
  },
};

describe('Remote runner (mq) AMQP adapter (mocked)', () => {
  test('register an AMQP runner and infer (mocked)', async () => {
    const registry = new ModelRegistry();
    await registry.register('mq-amqp-model', {
      versionId: 'v1',
      meta: {},
      artifact: Buffer.from('mq'),
    });
    await registry.promoteVersion('mq-amqp-model', 'v1', 'prod');

    const rim = new RemoteInferenceManager({
      modelRegistry: registry,
      batchSize: 2,
      batchTimeoutMs: 20,
    });

    rim.registerRemoteRunner('mq-amqp-model', 'v1', {
      type: 'mq',
      amqpUrl: 'amqp://local',
      requestQueue: 'rq',
      amqplibImpl: fakeAmqplib,
    });

    const r = await rim.infer({
      modelId: 'mq-amqp-model',
      versionId: 'v1',
      inputs: { a: 3 },
      requestId: 'req1',
    });
    expect(r.outputs).toEqual([{ res: { a: 3 } }]);

    await rim.shutdown();
  });
});
