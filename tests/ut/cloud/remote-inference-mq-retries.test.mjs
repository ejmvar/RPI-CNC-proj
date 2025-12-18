import RemoteInferenceManager from '../../../modules/cloud/remote-inference-manager.mjs';
import { ModelRegistry } from '../../../modules/cloud/model-registry.mjs';

describe('Remote runner (mq) retry/backoff behavior', () => {
  test('retries on no response and sends to dead-letter queue after max attempts', async () => {
    const calls = { sent: [], dlqSent: [] };

    // mock amqplib
    const fakeChannel = () => {
      return {
        assertQueue: async (_q, _opts) => ({ queue: _q || 'reply_q' }),
        consume: async (_q, _cb, _opts) => {
          // do nothing: no reply will ever be delivered
          return { consumerTag: 'ctag' };
        },
        sendToQueue: (queue, payload, props) => {
          const body = JSON.parse(payload.toString());
          if (queue === 'dead-letter-queue') {
            calls.dlqSent.push({ queue, body, props });
          } else {
            calls.sent.push({ queue, body, props });
          }
        },
        close: async () => {},
      };
    };

    const fakeConn = () => ({ createChannel: async () => fakeChannel(), close: async () => {} });

    const fakeAmqplib = {
      connect: async (_url) => fakeConn(),
    };

    const registry = new ModelRegistry();
    await registry.register('mq-retry-model', {
      versionId: 'v1',
      meta: {},
      artifact: Buffer.from('g'),
    });
    await registry.promoteVersion('mq-retry-model', 'v1', 'prod');

    const rim = new RemoteInferenceManager({
      modelRegistry: registry,
      batchSize: 2,
      batchTimeoutMs: 20,
    });

    rim.registerRemoteRunner('mq-retry-model', 'v1', {
      type: 'mq',
      amqpUrl: 'amqp://fake',
      requestQueue: 'request-queue',
      deadLetterQueue: 'dead-letter-queue',
      responseTimeoutMs: 50,
      visibilityTimeoutMs: 200,
      retry: { maxAttempts: 3, initialBackoffMs: 10, multiplier: 1 },
      amqplibImpl: fakeAmqplib,
    });

    // perform inference; since no response will be produced by fake channel, it should retry and then send to DLQ
    await expect(
      rim.infer({ modelId: 'mq-retry-model', versionId: 'v1', inputs: ['x'] })
    ).rejects.toThrow();

    // expect 3 send attempts and one dlq send
    expect(calls.sent.length).toBe(3);
    expect(calls.dlqSent.length).toBe(1);

    // check that expiration header is set on sent messages (visibility timeout)
    const first = calls.sent[0];
    expect(first.props.expiration).toBe(String(200));
    await rim.shutdown();
  }, 10000);
});
