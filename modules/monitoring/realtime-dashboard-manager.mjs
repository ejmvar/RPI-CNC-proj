/**
 * Real-Time Dashboard Manager
 * Manages live dashboard updates with real-time metric subscriptions
 * and WebSocket-based client connections for monitoring UIs.
 */

export class RealtimeDashboardManager {
  constructor(options = {}) {
    this.options = {
      maxClients: 1000,
      metricUpdateInterval: 1000,
      viewStateTimeout: 30000, // ms
      ...options,
    };

    this.clients = new Map(); // client_id -> { connection, subscriptions, state }
    this.subscriptions = new Map(); // metric_name -> Set<client_id>
    this.viewStates = new Map(); // client_id -> { viewConfig, filters }
    this.listeners = {};
    this.updateQueue = [];
    this.clientSequence = 0;
  }

  /**
   * Register a new client connection
   */
  registerClient(connection, options = {}) {
    if (this.clients.size >= this.options.maxClients) {
      throw new Error('Maximum client connections reached');
    }

    const clientId = `client_${++this.clientSequence}`;
    const client = {
      id: clientId,
      connection,
      subscriptions: new Set(),
      state: {
        connected: true,
        connectedAt: Date.now(),
        lastUpdate: Date.now(),
        viewType: options.viewType || 'dashboard',
        refreshInterval: options.refreshInterval || this.options.metricUpdateInterval,
      },
    };

    this.clients.set(clientId, client);
    this.viewStates.set(clientId, {
      viewConfig: options.viewConfig || {},
      filters: options.filters || {},
    });

    this.emit('clientConnected', { clientId, timestamp: Date.now() });
    return clientId;
  }

  /**
   * Remove client connection
   */
  unregisterClient(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Unsubscribe from all metrics
    client.subscriptions.forEach((metricName) => {
      this._unsubscribeFromMetric(clientId, metricName);
    });

    this.clients.delete(clientId);
    this.viewStates.delete(clientId);
    this.emit('clientDisconnected', { clientId, timestamp: Date.now() });
  }

  /**
   * Subscribe client to a metric
   */
  subscribeToMetric(clientId, metricName) {
    const client = this.clients.get(clientId);
    if (!client) throw new Error(`Client ${clientId} not found`);

    client.subscriptions.add(metricName);

    if (!this.subscriptions.has(metricName)) {
      this.subscriptions.set(metricName, new Set());
    }
    this.subscriptions.get(metricName).add(clientId);

    this.emit('clientSubscribed', { clientId, metricName, timestamp: Date.now() });
  }

  /**
   * Unsubscribe client from a metric
   * @private
   */
  _unsubscribeFromMetric(clientId, metricName) {
    const subscribers = this.subscriptions.get(metricName);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(metricName);
      }
    }

    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.delete(metricName);
    }
  }

  /**
   * Unsubscribe client from a metric (public method)
   */
  unsubscribeFromMetric(clientId, metricName) {
    this._unsubscribeFromMetric(clientId, metricName);
    this.emit('clientUnsubscribed', { clientId, metricName, timestamp: Date.now() });
  }

  /**
   * Publish metric update to subscribed clients
   */
  publishMetricUpdate(metricName, metricData) {
    const subscribers = this.subscriptions.get(metricName);
    if (!subscribers || subscribers.size === 0) return;

    const update = {
      metricName,
      data: metricData,
      timestamp: Date.now(),
    };

    subscribers.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client && client.state.connected) {
        this._queueUpdateForClient(clientId, update);
      }
    });
  }

  /**
   * Queue update for client delivery
   * @private
   */
  _queueUpdateForClient(clientId, update) {
    this.updateQueue.push({ clientId, update });
  }

  /**
   * Flush queued updates to clients
   */
  flushUpdates() {
    const updatesByClient = {};

    this.updateQueue.forEach(({ clientId, update }) => {
      if (!updatesByClient[clientId]) {
        updatesByClient[clientId] = [];
      }
      updatesByClient[clientId].push(update);
    });

    Object.entries(updatesByClient).forEach(([clientId, updates]) => {
      const client = this.clients.get(clientId);
      if (client && client.connection) {
        try {
          client.connection.send(JSON.stringify({ type: 'updates', data: updates }));
          client.state.lastUpdate = Date.now();
        } catch (err) {
          this.emit('deliveryError', { clientId, error: err.message });
        }
      }
    });

    this.updateQueue = [];
  }

  /**
   * Update client view state/filters
   */
  updateViewState(clientId, viewConfig) {
    const viewState = this.viewStates.get(clientId);
    if (!viewState) throw new Error(`View state for ${clientId} not found`);

    viewState.viewConfig = { ...viewState.viewConfig, ...viewConfig };
    this.emit('viewStateUpdated', { clientId, viewConfig, timestamp: Date.now() });
  }

  /**
   * Update client filters
   */
  updateFilters(clientId, filters) {
    const viewState = this.viewStates.get(clientId);
    if (!viewState) throw new Error(`View state for ${clientId} not found`);

    viewState.filters = { ...viewState.filters, ...filters };
    this.emit('filtersUpdated', { clientId, filters, timestamp: Date.now() });
  }

  /**
   * Get client subscriptions
   */
  getClientSubscriptions(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return [];
    return Array.from(client.subscriptions);
  }

  /**
   * Get metric subscribers
   */
  getMetricSubscribers(metricName) {
    const subscribers = this.subscriptions.get(metricName);
    return subscribers ? Array.from(subscribers) : [];
  }

  /**
   * Get client info
   */
  getClientInfo(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return null;

    return {
      ...client.state,
      subscriptions: Array.from(client.subscriptions),
      viewState: this.viewStates.get(clientId),
    };
  }

  /**
   * Get all connected clients
   */
  getAllClients() {
    const clients = [];
    this.clients.forEach((client, clientId) => {
      clients.push({
        clientId,
        state: client.state,
        subscriptionCount: client.subscriptions.size,
      });
    });
    return clients;
  }

  /**
   * Get dashboard statistics
   */
  getStatistics() {
    let totalSubscriptions = 0;
    this.subscriptions.forEach((subs) => {
      totalSubscriptions += subs.size;
    });

    const clientStates = [];
    this.clients.forEach((client) => {
      clientStates.push({
        viewType: client.state.viewType,
        subscriptions: client.subscriptions.size,
      });
    });

    return {
      connectedClients: this.clients.size,
      maxClients: this.options.maxClients,
      utilizationPercent: (this.clients.size / this.options.maxClients) * 100,
      metricsBeingTracked: this.subscriptions.size,
      totalSubscriptions,
      updateQueueLength: this.updateQueue.length,
      clientBreakdown: clientStates,
      timestamp: Date.now(),
    };
  }

  /**
   * Broadcast message to all clients
   */
  broadcastMessage(message, filterFn = null) {
    this.clients.forEach((client, clientId) => {
      if (!filterFn || filterFn(clientId, client)) {
        this._queueUpdateForClient(clientId, {
          type: 'broadcast',
          message,
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * Close connection for client
   */
  closeConnection(clientId, reason = 'closed by server') {
    const client = this.clients.get(clientId);
    if (client) {
      client.state.connected = false;
      client.state.disconnectReason = reason;
      this.unregisterClient(clientId);
    }
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }
}
