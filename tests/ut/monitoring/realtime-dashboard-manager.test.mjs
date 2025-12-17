import { RealtimeDashboardManager } from '../../../modules/monitoring/realtime-dashboard-manager.mjs';

describe('RealtimeDashboardManager', () => {
  let dashboardManager;
  let mockConnection;

  beforeEach(() => {
    dashboardManager = new RealtimeDashboardManager({
      maxClients: 100,
      metricUpdateInterval: 100,
    });

    // Mock connection with tracking
    mockConnection = {
      sendCount: 0,
      send: function () {
        this.sendCount++;
      },
      close: function () {},
    };
  });

  test('should initialize with default options', () => {
    const stats = dashboardManager.getStatistics();
    expect(stats.connectedClients).toBe(0);
    expect(stats.maxClients).toBe(100);
  });

  test('should register client connection', () => {
    const clientId = dashboardManager.registerClient(mockConnection);
    expect(clientId).toMatch(/^client_\d+$/);
    const stats = dashboardManager.getStatistics();
    expect(stats.connectedClients).toBe(1);
  });

  test('should emit client connected event', (done) => {
    let clientConnected = false;
    dashboardManager.on('clientConnected', () => {
      clientConnected = true;
    });

    dashboardManager.registerClient(mockConnection);

    setTimeout(() => {
      expect(clientConnected).toBe(true);
      done();
    }, 50);
  });

  test('should unregister client connection', () => {
    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.unregisterClient(clientId);
    const stats = dashboardManager.getStatistics();
    expect(stats.connectedClients).toBe(0);
  });

  test('should emit client disconnected event', (done) => {
    let clientDisconnected = false;
    dashboardManager.on('clientDisconnected', () => {
      clientDisconnected = true;
    });

    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.unregisterClient(clientId);

    setTimeout(() => {
      expect(clientDisconnected).toBe(true);
      done();
    }, 50);
  });

  test('should subscribe client to metric', () => {
    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.subscribeToMetric(clientId, 'cpu_usage');

    const subscriptions = dashboardManager.getClientSubscriptions(clientId);
    expect(subscriptions).toContain('cpu_usage');
  });

  test('should emit subscription event', (done) => {
    let subscriptionEmitted = false;
    dashboardManager.on('clientSubscribed', () => {
      subscriptionEmitted = true;
    });

    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.subscribeToMetric(clientId, 'memory_usage');

    setTimeout(() => {
      expect(subscriptionEmitted).toBe(true);
      done();
    }, 50);
  });

  test('should unsubscribe client from metric', () => {
    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.subscribeToMetric(clientId, 'cpu_usage');
    dashboardManager.unsubscribeFromMetric(clientId, 'cpu_usage');

    const subscriptions = dashboardManager.getClientSubscriptions(clientId);
    expect(subscriptions).not.toContain('cpu_usage');
  });

  test('should get metric subscribers', () => {
    const client1 = dashboardManager.registerClient(mockConnection);
    const client2 = dashboardManager.registerClient(mockConnection);

    dashboardManager.subscribeToMetric(client1, 'spindle_load');
    dashboardManager.subscribeToMetric(client2, 'spindle_load');

    const subscribers = dashboardManager.getMetricSubscribers('spindle_load');
    expect(subscribers.length).toBe(2);
  });

  test('should publish metric update to subscribers', () => {
    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.subscribeToMetric(clientId, 'temperature');

    dashboardManager.publishMetricUpdate('temperature', { value: 55 });
    dashboardManager.flushUpdates();

    expect(mockConnection.sendCount).toBeGreaterThan(0);
  });

  test('should not send updates to unsubscribed clients', () => {
    const clientId = dashboardManager.registerClient(mockConnection);
    const initialCount = mockConnection.sendCount;

    dashboardManager.publishMetricUpdate('cpu_usage', { value: 50 });
    dashboardManager.flushUpdates();

    expect(mockConnection.sendCount).toBe(initialCount);
  });

  test('should update view state', () => {
    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.updateViewState(clientId, { viewType: 'gauge', zoom: 2 });

    const clientInfo = dashboardManager.getClientInfo(clientId);
    expect(clientInfo.viewState.viewConfig.viewType).toBe('gauge');
  });

  test('should emit view state updated event', (done) => {
    let viewStateUpdated = false;
    dashboardManager.on('viewStateUpdated', () => {
      viewStateUpdated = true;
    });

    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.updateViewState(clientId, { refresh: true });

    setTimeout(() => {
      expect(viewStateUpdated).toBe(true);
      done();
    }, 50);
  });

  test('should update filters', () => {
    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.updateFilters(clientId, { metricType: 'system', severity: 'critical' });

    const clientInfo = dashboardManager.getClientInfo(clientId);
    expect(clientInfo.viewState.filters.metricType).toBe('system');
  });

  test('should emit filters updated event', (done) => {
    let filtersUpdated = false;
    dashboardManager.on('filtersUpdated', () => {
      filtersUpdated = true;
    });

    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.updateFilters(clientId, { active: true });

    setTimeout(() => {
      expect(filtersUpdated).toBe(true);
      done();
    }, 50);
  });

  test('should get client info', () => {
    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.subscribeToMetric(clientId, 'cpu_usage');

    const clientInfo = dashboardManager.getClientInfo(clientId);
    expect(clientInfo).not.toBeNull();
    expect(clientInfo.connected).toBe(true);
    expect(clientInfo.subscriptions).toContain('cpu_usage');
  });

  test('should get all connected clients', () => {
    dashboardManager.registerClient(mockConnection);
    dashboardManager.registerClient(mockConnection);
    dashboardManager.registerClient(mockConnection);

    const clients = dashboardManager.getAllClients();
    expect(clients.length).toBe(3);
  });

  test('should get statistics', () => {
    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.subscribeToMetric(clientId, 'cpu_usage');
    dashboardManager.subscribeToMetric(clientId, 'memory_usage');

    const stats = dashboardManager.getStatistics();
    expect(stats.connectedClients).toBe(1);
    expect(stats.metricsBeingTracked).toBeGreaterThan(0);
    expect(stats.utilizationPercent).toBeGreaterThan(0);
  });

  test('should broadcast message to all clients', () => {
    const clientId1 = dashboardManager.registerClient(mockConnection);
    const clientId2 = dashboardManager.registerClient(mockConnection);

    dashboardManager.broadcastMessage({ type: 'alert', message: 'System maintenance' });
    dashboardManager.flushUpdates();

    expect(mockConnection.sendCount).toBeGreaterThan(0);
  });

  test('should broadcast with filter', () => {
    const clientId = dashboardManager.registerClient(mockConnection);
    const initialCount = mockConnection.sendCount;

    dashboardManager.broadcastMessage({ type: 'alert' }, (cId) => cId === clientId);
    dashboardManager.flushUpdates();

    expect(mockConnection.sendCount).toBeGreaterThan(initialCount);
  });

  test('should close client connection', (done) => {
    let clientDisconnected = false;
    dashboardManager.on('clientDisconnected', () => {
      clientDisconnected = true;
    });

    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.closeConnection(clientId, 'timeout');

    setTimeout(() => {
      expect(clientDisconnected).toBe(true);
      expect(dashboardManager.getClientInfo(clientId)).toBeNull();
      done();
    }, 50);
  });

  test('should reject registration when maxClients reached', () => {
    const m = new RealtimeDashboardManager({ maxClients: 2 });
    m.registerClient(mockConnection);
    m.registerClient(mockConnection);

    expect(() => m.registerClient(mockConnection)).toThrow();
  });

  test('should flush queued updates', () => {
    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.subscribeToMetric(clientId, 'cpu_usage');

    dashboardManager.publishMetricUpdate('cpu_usage', { value: 50 });
    expect(dashboardManager.getStatistics().updateQueueLength).toBeGreaterThan(0);

    dashboardManager.flushUpdates();
    expect(dashboardManager.getStatistics().updateQueueLength).toBe(0);
  });

  test('should track client subscription count', () => {
    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.subscribeToMetric(clientId, 'cpu_usage');
    dashboardManager.subscribeToMetric(clientId, 'memory_usage');
    dashboardManager.subscribeToMetric(clientId, 'spindle_load');

    const clients = dashboardManager.getAllClients();
    expect(clients[0].subscriptionCount).toBe(3);
  });

  test('should unsubscribe all metrics when client unregisters', () => {
    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.subscribeToMetric(clientId, 'cpu_usage');
    dashboardManager.subscribeToMetric(clientId, 'memory_usage');

    dashboardManager.unregisterClient(clientId);

    const cpuSubscribers = dashboardManager.getMetricSubscribers('cpu_usage');
    const memSubscribers = dashboardManager.getMetricSubscribers('memory_usage');

    expect(cpuSubscribers).not.toContain(clientId);
    expect(memSubscribers).not.toContain(clientId);
  });

  test('should handle multiple subscriptions to same metric', () => {
    const clientId = dashboardManager.registerClient(mockConnection);
    dashboardManager.subscribeToMetric(clientId, 'cpu_usage');
    dashboardManager.subscribeToMetric(clientId, 'cpu_usage'); // duplicate

    const subscriptions = dashboardManager.getClientSubscriptions(clientId);
    const cpuCount = subscriptions.filter((s) => s === 'cpu_usage').length;

    expect(cpuCount).toBeGreaterThanOrEqual(1);
  });

  test('should calculate correct utilization percentage', () => {
    const m = new RealtimeDashboardManager({ maxClients: 100 });
    m.registerClient(mockConnection);
    m.registerClient(mockConnection);

    const stats = m.getStatistics();
    expect(stats.utilizationPercent).toBe(2);
  });
});
