/**
 * WebSocket Adapter Tests
 *
 * Tests for the OpenHotel WebSocket adapter including
 * connection management, message handling, and reconnection logic.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url, protocols) {
    this.url = url;
    this.protocols = protocols;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
    this.sentMessages = [];
  }

  send(data) {
    this.sentMessages.push(data);
  }

  close(code, reason) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code, reason, wasClean: true });
    }
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen({});
    }
  }

  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  simulateError(error) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

// Setup global mock
global.WebSocket = MockWebSocket;

// Import after mock setup
import { OpenHotelWebSocket } from '../adapters/websocketAdapter';
import { OH_EVENT } from '../config';

describe('OpenHotelWebSocket', () => {
  let socket;
  let mockWs;

  beforeEach(() => {
    vi.useFakeTimers();
    socket = new OpenHotelWebSocket({
      url: 'ws://test.server',
      debug: false
    });
  });

  afterEach(() => {
    socket?.disconnect();
    vi.useRealTimers();
  });

  describe('Connection', () => {
    it('should connect to the server', async () => {
      const connectPromise = socket.connect();

      // Get the created WebSocket instance
      mockWs = socket.socket;
      expect(mockWs).toBeDefined();
      expect(mockWs.url).toBe('ws://test.server/proxy');

      // Simulate successful connection
      mockWs.simulateOpen();

      await connectPromise;
      expect(socket.isConnected).toBe(true);
    });

    it('should handle connection timeout', async () => {
      const connectPromise = socket.connect();

      // Don't simulate open - let it timeout
      vi.advanceTimersByTime(15000);

      await expect(connectPromise).rejects.toThrow('Connection timeout');
    });

    it('should set protocols for authentication', async () => {
      socket.protocols = ['account123', 'testuser'];
      socket.connect();

      mockWs = socket.socket;
      expect(mockWs.protocols).toEqual(['account123', 'testuser']);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      const connectPromise = socket.connect();
      mockWs = socket.socket;
      mockWs.simulateOpen();
      await connectPromise;
    });

    it('should parse and emit events', () => {
      const callback = vi.fn();
      socket.on(OH_EVENT.WELCOME, callback);

      mockWs.simulateMessage({
        event: OH_EVENT.WELCOME,
        message: { accountId: '123', username: 'test' }
      });

      expect(callback).toHaveBeenCalledWith({
        accountId: '123',
        username: 'test'
      });
    });

    it('should handle multiple listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      socket.on(OH_EVENT.ADD_HUMAN, callback1);
      socket.on(OH_EVENT.ADD_HUMAN, callback2);

      mockWs.simulateMessage({
        event: OH_EVENT.ADD_HUMAN,
        message: { user: { accountId: '456' } }
      });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should unsubscribe correctly', () => {
      const callback = vi.fn();
      const unsubscribe = socket.on(OH_EVENT.MESSAGE, callback);

      unsubscribe();

      mockWs.simulateMessage({
        event: OH_EVENT.MESSAGE,
        message: { text: 'hello' }
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Message Sending', () => {
    beforeEach(async () => {
      const connectPromise = socket.connect();
      mockWs = socket.socket;
      mockWs.simulateOpen();
      await connectPromise;
    });

    it('should send messages when connected', () => {
      socket.emit(OH_EVENT.JOIN_ROOM, { roomId: 'room123' });

      expect(mockWs.sentMessages.length).toBe(1);
      const sent = JSON.parse(mockWs.sentMessages[0]);
      expect(sent.event).toBe('$$user-data');
      expect(sent.message.event).toBe(OH_EVENT.JOIN_ROOM);
    });

    it('should queue messages when disconnected', () => {
      socket.disconnect();

      socket.emit(OH_EVENT.MESSAGE, { text: 'hello' });

      expect(socket.messageQueue.length).toBe(1);
    });
  });

  describe('Reconnection', () => {
    it('should attempt reconnection on unexpected close', async () => {
      const connectPromise = socket.connect();
      mockWs = socket.socket;
      mockWs.simulateOpen();
      await connectPromise;

      // Simulate unexpected close
      mockWs.close(1006, 'Abnormal closure');

      // Should schedule reconnect
      expect(socket.reconnectAttempts).toBe(0);

      // Advance time to trigger reconnect
      vi.advanceTimersByTime(3000);

      // New connection attempt
      expect(socket.connecting).toBe(true);
    });

    it('should not reconnect on normal close', async () => {
      const connectPromise = socket.connect();
      mockWs = socket.socket;
      mockWs.simulateOpen();
      await connectPromise;

      // Normal close
      mockWs.close(1000, 'Normal closure');

      vi.advanceTimersByTime(10000);

      expect(socket.connecting).toBe(false);
      expect(socket.reconnectAttempts).toBe(0);
    });
  });
});

describe('Message Queue', () => {
  it('should preserve message order', async () => {
    const socket = new OpenHotelWebSocket({ debug: false });

    // Queue messages while disconnected
    socket.emit('event1', { data: 1 });
    socket.emit('event2', { data: 2 });
    socket.emit('event3', { data: 3 });

    expect(socket.messageQueue.length).toBe(3);

    // Connect
    const connectPromise = socket.connect();
    const mockWs = socket.socket;
    mockWs.simulateOpen();
    await connectPromise;

    // Messages should be flushed in order
    expect(mockWs.sentMessages.length).toBe(3);

    const messages = mockWs.sentMessages.map(m => JSON.parse(m));
    expect(messages[0].message.event).toBe('event1');
    expect(messages[1].message.event).toBe('event2');
    expect(messages[2].message.event).toBe('event3');

    socket.disconnect();
  });
});
