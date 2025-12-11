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
    expect(events.some((e) => e.startsWith('data:ok:'))).toBeTruthy();
    expect(events.includes('disconnected')).toBe(true);
  });

  test('throws error when sending command while disconnected', async () => {
    const g = createGateway({ simulate: true });

    await expect(g.sendCommand('G0 X0')).rejects.toThrow('not_connected');
  });

  test('returns false when disconnecting while not connected', async () => {
    const g = createGateway({ simulate: true });

    const result = await g.disconnect();
    expect(result).toBe(false);
  });

  test('can connect, disconnect, and reconnect', async () => {
    const g = createGateway({ simulate: true });

    await g.connect();
    expect(g.connected).toBe(true);

    await g.disconnect();
    expect(g.connected).toBe(false);

    await g.connect();
    expect(g.connected).toBe(true);

    await g.disconnect();
  });

  test('returns null lastCommand when no command sent', () => {
    const g = createGateway({ simulate: true });

    expect(g.lastCommand()).toBeNull();
  });

  test('throws error when connecting in non-simulated mode', async () => {
    const g = createGateway({ simulate: false });

    await expect(g.connect()).rejects.toThrow('non-simulated gateway not implemented');
  });

  test('throws error when sending command in non-simulated mode', async () => {
    const g = createGateway({ simulate: false });
    g.connected = true; // Force connected state

    await expect(g.sendCommand('G0 X0')).rejects.toThrow(
      'sendCommand not implemented for real hardware'
    );
  });

  test('handles disconnect in non-simulated mode', async () => {
    const g = createGateway({ simulate: false });
    g.connected = true;

    const result = await g.disconnect();
    expect(result).toBe(true);
    expect(g.connected).toBe(false);
  });
});
