const { createQueue } = require('../../../modules/backend/firmware-queue');

describe('Firmware command queue', () => {
  test('enqueue -> processNext -> processed events', async () => {
    const q = createQueue();
    const events = [];
    q.on('enqueue', c => events.push(`e:${c}`));
    q.on('dequeue', c => events.push(`d:${c}`));
    q.on('processing', c => events.push(`p:${c}`));
    q.on('processed', r => events.push(`ok:${r.cmd}:${r.res}`));

    q.enqueue('G1 X0 Y0');
    q.enqueue('G1 X10 Y10');
    expect(q.size()).toBe(2);

    const result = await q.processNext(async (cmd) => {
      // simulate a tiny processing
      await new Promise(r => setTimeout(r, 5));
      return `ack-${cmd}`;
    });

    expect(result.res).toMatch(/^ack-/);
    expect(q.size()).toBe(1);
    expect(events).toEqual(expect.arrayContaining([expect.stringMatching(/^e:/), expect.stringMatching(/^p:/), expect.stringMatching(/^ok:/)]));
  });
});
