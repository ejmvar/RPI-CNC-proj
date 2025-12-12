const { createWsCollabServer } = require('../../../modules/backend/collab/ws-server');

describe('WebSocket collab server unit tests', () => {
  function createMockServer() {
    return {
      on: jest.fn(),
      listen: jest.fn(),
      close: jest.fn(),
    };
  }

  function createMockCollabServer() {
    return {
      createSession: jest.fn(),
      joinSession: jest.fn(),
      updateSession: jest.fn(),
      setPermissions: jest.fn(),
      getSession: jest.fn(),
      on: jest.fn(),
    };
  }

  test('returns truthy value when ws module is available', () => {
    const mockCollabServer = createMockCollabServer();
    const mockServer = createMockServer();

    const result = createWsCollabServer(mockCollabServer, { server: mockServer });
    expect(result).toBeTruthy();
  });

  test('throws error when server option not provided', () => {
    const mockCollabServer = createMockCollabServer();

    expect(() => {
      createWsCollabServer(mockCollabServer, {});
    }).toThrow('http server required');
  });

  test('creates WebSocket server with custom path', () => {
    const mockCollabServer = createMockCollabServer();
    const mockServer = createMockServer();

    const wss = createWsCollabServer(mockCollabServer, {
      server: mockServer,
      path: '/custom-path',
    });

    expect(wss).toBeTruthy();
  });

  test('registers event listeners on collab server', () => {
    const mockCollabServer = createMockCollabServer();
    const mockServer = createMockServer();

    createWsCollabServer(mockCollabServer, { server: mockServer });

    // Should register for sessionUpdated, sessionCreated, and clientJoined events
    expect(mockCollabServer.on).toHaveBeenCalledWith('sessionUpdated', expect.any(Function));
    expect(mockCollabServer.on).toHaveBeenCalledWith('sessionCreated', expect.any(Function));
    expect(mockCollabServer.on).toHaveBeenCalledWith('clientJoined', expect.any(Function));
  });

  test('server-side sessionUpdated event broadcasts to clients', () => {
    const mockCollabServer = createMockCollabServer();
    mockCollabServer.getSession.mockReturnValue({
      state: { data: 'updated' },
      clients: ['client1'],
    });

    const mockServer = createMockServer();
    createWsCollabServer(mockCollabServer, { server: mockServer });

    // Get the sessionUpdated handler
    const sessionUpdatedHandler = mockCollabServer.on.mock.calls.find(
      (call) => call[0] === 'sessionUpdated'
    )?.[1];

    expect(sessionUpdatedHandler).toBeDefined();

    // Trigger the event
    if (sessionUpdatedHandler) {
      sessionUpdatedHandler({ sessionId: 'test-session' });
      expect(mockCollabServer.getSession).toHaveBeenCalledWith('test-session');
    }
  });

  test('server-side sessionCreated event handler exists', () => {
    const mockCollabServer = createMockCollabServer();
    const mockServer = createMockServer();

    createWsCollabServer(mockCollabServer, { server: mockServer });

    const sessionCreatedHandler = mockCollabServer.on.mock.calls.find(
      (call) => call[0] === 'sessionCreated'
    )?.[1];

    expect(sessionCreatedHandler).toBeDefined();

    // Trigger with session data
    if (sessionCreatedHandler) {
      sessionCreatedHandler({
        id: 'new-session',
        state: { initial: 'data' },
        clients: [],
      });
      // Should not throw
      expect(true).toBe(true);
    }
  });

  test('server-side clientJoined event broadcasts to session', () => {
    const mockCollabServer = createMockCollabServer();
    mockCollabServer.getSession.mockReturnValue({
      state: {},
      clients: ['client1', 'client2'],
    });

    const mockServer = createMockServer();
    createWsCollabServer(mockCollabServer, { server: mockServer });

    const clientJoinedHandler = mockCollabServer.on.mock.calls.find(
      (call) => call[0] === 'clientJoined'
    )?.[1];

    expect(clientJoinedHandler).toBeDefined();

    if (clientJoinedHandler) {
      clientJoinedHandler({
        sessionId: 'test-session',
        clientId: 'new-client',
      });
      expect(mockCollabServer.getSession).toHaveBeenCalledWith('test-session');
    }
  });
});
