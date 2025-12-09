const { createStreamer } = require('../../../modules/backend/streaming/position-streamer');

describe('Position streamer (simulation)', () => {
  test('start/emit/stop flow', async () => {
    const s = createStreamer({ intervalMs: 20 });
    const events = [];
    s.on('start', () => events.push('start'));
    s.on('stop', () => events.push('stop'));
    let posCount = 0;
    s.on('position', (p) => { posCount++; events.push(p); });

    s.start();
    expect(s.isRunning()).toBe(true);

    // wait for a few ticks
    await new Promise(res => setTimeout(res, 120));
    expect(posCount).toBeGreaterThanOrEqual(4);

    s.stop();
    expect(s.isRunning()).toBe(false);
    expect(events[0]).toBe('start');
    expect(events.some(e => e === 'stop')).toBe(true);
  });
});
