import { describe, it, expect, beforeEach } from '@jest/globals';
import { WebSocketManager } from '../../../modules/integration/websocket-manager.mjs';

describe('WebSocketManager', () => {
  let manager;

  beforeEach(() => {
    manager = new WebSocketManager({
      enableHeartbeat: false,
      heartbeatInterval: 1000,
      maxConnections: 100,
    });
  });

  describe('Connection Management', () => {
    it('should handle client connection', () => {
      const ws = {};
      const client = manager.handleConnection('client1', ws);

      expect(client).toBeDefined();
      expect(client.id).toBe('client1');
      expect(manager.clients.size).toBe(1);
    });

    it('should reject connection at capacity', () => {
      const tinyManager = new WebSocketManager({ maxConnections: 1 });
      const ws1 = {};
      const ws2 = {};

      tinyManager.handleConnection('client1', ws1);
      tinyManager.handleConnection('client2', ws2);

      // Second should be rejected (simulated by close call)
      expect(tinyManager.clients.size).toBeLessThanOrEqual(1);
    });

    it('should handle client disconnection', () => {
      manager.handleConnection('client1', {});
      manager.handleDisconnection('client1');

      expect(manager.clients.size).toBe(0);
    });

    it('should track connection count', () => {
      manager.handleConnection('client1', {});
      manager.handleConnection('client2', {});

      const stats = manager.getStatistics();
      expect(stats.activeConnections).toBe(2);
    });
  });

  describe('Channel Subscription', () => {
    it('should subscribe to channel', () => {
      manager.handleConnection('client1', {});
      const result = manager.subscribe('client1', 'notifications');

      expect(result).toBe(true);
      expect(manager.getChannelSubscribers('notifications')).toContain('client1');
    });

    it('should unsubscribe from channel', () => {
      manager.handleConnection('client1', {});
      manager.subscribe('client1', 'notifications');
      manager.unsubscribe('client1', 'notifications');

      expect(manager.getChannelSubscribers('notifications')).not.toContain('client1');
    });

    it('should get client subscriptions', () => {
      manager.handleConnection('client1', {});
      manager.subscribe('client1', 'channel1');
      manager.subscribe('client1', 'channel2');

      const subs = manager.getClientSubscriptions('client1');
      expect(subs).toContain('channel1');
      expect(subs).toContain('channel2');
    });

    it('should handle multiple subscribers', () => {
      manager.handleConnection('client1', {});
      manager.handleConnection('client2', {});

      manager.subscribe('client1', 'notifications');
      manager.subscribe('client2', 'notifications');

      const subscribers = manager.getChannelSubscribers('notifications');
      expect(subscribers).toHaveLength(2);
      expect(subscribers).toContain('client1');
      expect(subscribers).toContain('client2');
    });
  });

  describe('Message Broadcasting', () => {
    it('should broadcast to channel', () => {
      manager.handleConnection('client1', {});
      manager.handleConnection('client2', {});

      manager.subscribe('client1', 'notifications');
      manager.subscribe('client2', 'notifications');

      const sent = manager.broadcast('notifications', { message: 'Hello' });

      expect(sent).toBe(2);
    });

    it('should broadcast to empty channel', () => {
      const sent = manager.broadcast('empty-channel', { message: 'Test' });
      expect(sent).toBe(0);
    });

    it('should broadcast to all clients', () => {
      manager.handleConnection('client1', {});
      manager.handleConnection('client2', {});
      manager.handleConnection('client3', {});

      const sent = manager.broadcastAll({ message: 'Global' });
      expect(sent).toBe(3);
    });

    it('should track message count', () => {
      manager.handleConnection('client1', {});
      manager.subscribe('client1', 'notifications');

      manager.broadcast('notifications', { message: 'Test1' });
      manager.broadcast('notifications', { message: 'Test2' });

      const stats = manager.getStatistics();
      expect(stats.totalMessages).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Point-to-Point Messaging', () => {
    it('should send message to specific client', () => {
      manager.handleConnection('client1', {});

      const result = manager.sendToClient('client1', { message: 'Hello' });

      expect(result).toBe(true);
      expect(manager.messageHistory).toHaveLength(1);
    });

    it('should reject message to non-existent client', () => {
      const result = manager.sendToClient('non-existent', { message: 'Hello' });

      expect(result).toBe(false);
    });

    it('should track client message count', () => {
      manager.handleConnection('client1', {});

      manager.sendToClient('client1', { message: 'Test1' });
      manager.sendToClient('client1', { message: 'Test2' });

      const client = manager.getClientInfo('client1');
      expect(client.messageCount).toBe(2);
    });

    it('should reject message exceeding size limit', () => {
      const tinyManager = new WebSocketManager({ maxMessageSize: 10 });
      tinyManager.handleConnection('client1', {});

      const result = tinyManager.sendToClient('client1', {
        message: 'This is a message that exceeds the size limit',
      });

      expect(result).toBe(false);
    });
  });

  describe('Client Information', () => {
    it('should get client info', () => {
      manager.handleConnection('client1', {});

      const info = manager.getClientInfo('client1');
      expect(info).toBeDefined();
      expect(info.id).toBe('client1');
      expect(info.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return null for non-existent client', () => {
      const info = manager.getClientInfo('non-existent');
      expect(info).toBeNull();
    });

    it('should get all clients', () => {
      manager.handleConnection('client1', {});
      manager.handleConnection('client2', {});

      const clients = manager.getAllClients();
      expect(clients).toHaveLength(2);
    });
  });

  describe('Connection Closing', () => {
    it('should close connection', () => {
      manager.handleConnection('client1', {});
      const result = manager.closeConnection('client1', 1000, 'Normal closure');

      expect(result).toBe(true);
      expect(manager.clients.size).toBe(0);
    });

    it('should return false for non-existent client', () => {
      const result = manager.closeConnection('non-existent');
      expect(result).toBe(false);
    });

    it('should emit connectionClosed event', (done) => {
      manager.handleConnection('client1', {});

      manager.on('connectionClosed', (data) => {
        expect(data.clientId).toBe('client1');
        expect(data.code).toBe(1000);
        done();
      });

      manager.closeConnection('client1', 1000, 'Normal closure');
    });
  });

  describe('Message History', () => {
    it('should maintain message history', () => {
      manager.handleConnection('client1', {});

      manager.sendToClient('client1', { message: 'Test1' });
      manager.sendToClient('client1', { message: 'Test2' });

      expect(manager.messageHistory.length).toBeGreaterThanOrEqual(2);
    });

    it('should limit message history size', () => {
      const limitedManager = new WebSocketManager();
      limitedManager.handleConnection('client1', {});

      // Add more than the internal limit
      for (let i = 0; i < 10100; i++) {
        limitedManager.sendToClient('client1', { id: i });
      }

      expect(limitedManager.messageHistory.length).toBeLessThanOrEqual(10000);
    });
  });

  describe('Statistics', () => {
    it('should track statistics', () => {
      manager.handleConnection('client1', {});
      manager.subscribe('client1', 'channel1');
      manager.broadcast('channel1', { message: 'Test' });

      const stats = manager.getStatistics();
      expect(stats.activeConnections).toBe(1);
      expect(stats.totalChannels).toBeGreaterThanOrEqual(1);
      expect(stats.totalMessages).toBeGreaterThanOrEqual(1);
    });

    it('should track connection count', () => {
      manager.handleConnection('client1', {});
      manager.handleConnection('client2', {});
      manager.handleConnection('client3', {});

      const stats = manager.getStatistics();
      expect(stats.totalConnections).toBe(3);
      expect(stats.activeConnections).toBe(3);
    });
  });

  describe('Events', () => {
    it('should emit clientConnected event', () => {
      let eventEmitted = false;
      manager.on('clientConnected', (data) => {
        eventEmitted = true;
        expect(data.clientId).toBe('client1');
        expect(data.totalClients).toBe(1);
      });

      manager.handleConnection('client1', {});
      expect(eventEmitted).toBe(true);
    });

    it('should emit subscribed event', () => {
      let eventEmitted = false;
      manager.handleConnection('client1', {});

      manager.on('subscribed', (data) => {
        eventEmitted = true;
        expect(data.clientId).toBe('client1');
        expect(data.channel).toBe('notifications');
      });

      manager.subscribe('client1', 'notifications');
      expect(eventEmitted).toBe(true);
    });

    it('should emit broadcast event', () => {
      let eventEmitted = false;
      manager.handleConnection('client1', {});
      manager.subscribe('client1', 'notifications');

      manager.on('broadcast', (data) => {
        eventEmitted = true;
        expect(data.channel).toBe('notifications');
        expect(data.sent).toBe(1);
      });

      manager.broadcast('notifications', { message: 'Test' });
      expect(eventEmitted).toBe(true);
    });

    it('should emit clientDisconnected event', () => {
      let eventEmitted = false;
      manager.handleConnection('client1', {});

      manager.on('clientDisconnected', (data) => {
        eventEmitted = true;
        expect(data.clientId).toBe('client1');
        expect(data.messageCount).toBe(0);
      });

      manager.handleDisconnection('client1');
      expect(eventEmitted).toBe(true);
    });
  });

  describe('Binary Support', () => {
    it('should support binary messages', () => {
      manager.handleConnection('client1', {});

      const result = manager.sendToClient('client1', Buffer.from('binary data'), {
        binary: true,
      });

      expect(result).toBe(true);
    });
  });

  describe('Message ID Generation', () => {
    it('should generate unique message IDs', () => {
      manager.handleConnection('client1', {});

      manager.sendToClient('client1', { data: 'test1' });
      manager.sendToClient('client1', { data: 'test2' });

      const message1 = manager.messageHistory[0];
      const message2 = manager.messageHistory[1];

      expect(message1.message.id).not.toBe(message2.message.id);
    });
  });
});
