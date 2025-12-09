const { createGateway } = require('../../../modules/backend/firmware-gateway/index.js');

describe('Firmware gateway (simulation)', () => {
  test('connect, send command and disconnect flow', async () => {
    const g = createGateway({ simulate: true });
    const events = [];
    g.on('connected', () => events.push('connected'));
    g.on('disconnected', () => events.push('disconnected'));
    g.on('commandSent', (c) => events.push(`sent:${c}`));
    g.on('data', (d) => events.push(`data:${d}`));

    const ok = await g.connect();
    expect(ok).toBe(true);
    expect(g.connected).toBe(true);

    const resp = await g.sendCommand('G1 X0 Y0');
    expect(resp).toMatch(/ok:/);
    expect(g.lastCommand()).toBe('G1 X0 Y0');

    const disc = await g.disconnect();
    expect(disc).toBe(true);
    expect(g.connected).toBe(false);

    // minimal check that events fired in plausible order
    expect(events[0]).toBe('connected');
    expect(events).toContainEqual(expect.stringMatching(/^sent:/));
    expect(events.some(e => e.startsWith('data:ok:'))).toBeTruthy();
    expect(events.includes('disconnected')).toBe(true);
  });
});
