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
});
