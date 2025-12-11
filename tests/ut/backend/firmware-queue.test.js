const { createQueue } = require('../../../modules/backend/firmware-queue');

describe('Firmware command queue', () => {
  let queue;

  beforeEach(() => {
    queue = createQueue();
  });

  describe('enqueue and dequeue', () => {
    test('enqueue adds command to queue', () => {
      queue.enqueue('G0 X0');

      expect(queue.size()).toBe(1);
    });

    test('enqueue emits event', (done) => {
      queue.on('enqueue', (cmd) => {
        expect(cmd).toBe('G1 X10');
        done();
      });

      queue.enqueue('G1 X10');
    });

    test('dequeue removes and returns command', () => {
      queue.enqueue('G0 X0');
      queue.enqueue('G1 X10');

      const cmd = queue.dequeue();

      expect(cmd).toBe('G0 X0');
      expect(queue.size()).toBe(1);
    });

    test('dequeue emits event', (done) => {
      queue.enqueue('G0 X0');

      queue.on('dequeue', (cmd) => {
        expect(cmd).toBe('G0 X0');
        done();
      });

      queue.dequeue();
    });

    test('dequeue returns undefined when empty', () => {
      const cmd = queue.dequeue();

      expect(cmd).toBeUndefined();
    });
  });

  describe('peek and size', () => {
    test('peek returns first command without removing', () => {
      queue.enqueue('G0 X0');
      queue.enqueue('G1 X10');

      expect(queue.peek()).toBe('G0 X0');
      expect(queue.size()).toBe(2);
    });

    test('size returns queue length', () => {
      expect(queue.size()).toBe(0);

      queue.enqueue('G0');
      expect(queue.size()).toBe(1);

      queue.enqueue('G1');
      expect(queue.size()).toBe(2);
    });
  });

  describe('clear', () => {
    test('clear empties the queue', () => {
      queue.enqueue('G0 X0');
      queue.enqueue('G1 X10');

      queue.clear();

      expect(queue.size()).toBe(0);
    });

    test('clear emits cleared event', (done) => {
      queue.on('cleared', done);
      queue.clear();
    });
  });

  describe('processNext', () => {
    test('processes next command with handler', async () => {
      queue.enqueue('G0 X0');

      const result = await queue.processNext(async (cmd) => {
        return `ack-${cmd}`;
      });

      expect(result.cmd).toBe('G0 X0');
      expect(result.res).toBe('ack-G0 X0');
    });

    test('returns null when queue is empty', async () => {
      const result = await queue.processNext(async () => 'ok');

      expect(result).toBeNull();
    });

    test('throws when already processing', async () => {
      queue.enqueue('G0 X0');
      queue.enqueue('G1 X10');

      // Start first processing
      const promise1 = queue.processNext(async () => {
        await new Promise((r) => setTimeout(r, 10));
        return 'ok';
      });

      // Try to process while first is running
      await expect(queue.processNext(async () => 'fail')).rejects.toThrow('already_processing');

      await promise1;
    });

    test('emits processing event', (done) => {
      queue.enqueue('G0 X0');

      queue.on('processing', (cmd) => {
        expect(cmd).toBe('G0 X0');
        done();
      });

      queue.processNext(async () => 'ok');
    });

    test('emits processed event with result', async () => {
      queue.enqueue('G1 X10');

      const promise = new Promise((resolve) => {
        queue.on('processed', resolve);
      });

      await queue.processNext(async (cmd) => `done-${cmd}`);

      const event = await promise;
      expect(event.cmd).toBe('G1 X10');
      expect(event.res).toBe('done-G1 X10');
    });

    test('resets processing flag after completion', async () => {
      queue.enqueue('G0');
      queue.enqueue('G1');

      await queue.processNext(async () => 'ok');

      // Should be able to process again
      await expect(queue.processNext(async () => 'ok')).resolves.toBeDefined();
    });
  });
});
