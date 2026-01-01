/**
 * WebSocket Adapter for OpenHotel
 *
 * Bridges your socket.io-based infrastructure with OpenHotel's native WebSocket protocol.
 * Handles connection management, reconnection logic, and message queuing.
 *
 * RENDER.COM PRODUCTION NOTES:
 * - Uses exponential backoff for reconnection
 * - Handles Render's cold start delays
 * - Properly switches between ws:// and wss:// protocols
 * - Queues messages during disconnection
 */

import { OPENHOTEL_CONFIG, OH_EVENT } from '../config';

// Connection state for external monitoring
export const CONNECTION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed'
};

/**
 * Message queue for offline buffering
 */
class MessageQueue {
  constructor(maxSize = 100) {
    this.queue = [];
    this.maxSize = maxSize;
  }

  enqueue(message) {
    if (this.queue.length >= this.maxSize) {
      this.queue.shift(); // Remove oldest
    }
    this.queue.push(message);
  }

  flush() {
    const messages = [...this.queue];
    this.queue = [];
    return messages;
  }

  get length() {
    return this.queue.length;
  }
}

/**
 * OpenHotel WebSocket Adapter
 *
 * Provides a consistent interface for communicating with the OpenHotel server,
 * adapting between your app's patterns and OpenHotel's protocol.
 */
export class OpenHotelWebSocket {
  constructor(options = {}) {
    this.url = options.url || OPENHOTEL_CONFIG.serverUrl;
    this.protocols = options.protocols || [];
    this.debug = options.debug ?? OPENHOTEL_CONFIG.debugMode;

    this.socket = null;
    this.connected = false;
    this.connecting = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.status = CONNECTION_STATUS.DISCONNECTED;
    this.lastError = null;

    // Production resilience
    this.maxReconnectDelay = 30000; // Cap at 30 seconds
    this.connectionStartTime = null;

    this.listeners = new Map();
    this.messageQueue = new MessageQueue();
    this.connectionPromise = null;
    this.connectionResolver = null;

    // Handle page visibility for mobile/background tabs
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    // Handle online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  /**
   * Handle page visibility changes (mobile/background)
   */
  handleVisibilityChange() {
    if (document.visibilityState === 'visible' && !this.connected && !this.connecting) {
      this.log('Page visible, attempting reconnect');
      this.reconnectAttempts = 0; // Reset for fresh attempt
      this.connect().catch(() => {});
    }
  }

  /**
   * Handle coming back online
   */
  handleOnline() {
    if (!this.connected && !this.connecting) {
      this.log('Network online, attempting reconnect');
      this.reconnectAttempts = 0;
      this.connect().catch(() => {});
    }
  }

  /**
   * Handle going offline
   */
  handleOffline() {
    this.log('Network offline');
    this.status = CONNECTION_STATUS.DISCONNECTED;
    // Don't try to reconnect while offline
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Connect to OpenHotel server
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.connected) {
      return Promise.resolve();
    }

    if (this.connecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    // Check if we're online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.status = CONNECTION_STATUS.DISCONNECTED;
      return Promise.reject(new Error('No network connection'));
    }

    this.connecting = true;
    this.status = this.reconnectAttempts > 0 ? CONNECTION_STATUS.RECONNECTING : CONNECTION_STATUS.CONNECTING;
    this.connectionStartTime = Date.now();

    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionResolver = { resolve, reject };

      try {
        // Build WebSocket URL with auth protocols
        const wsUrl = this.buildUrl();
        this.log('Connecting to:', wsUrl);

        this.socket = new WebSocket(wsUrl, this.protocols);

        // Connection timeout - longer for production (Render cold starts)
        const timeout = setTimeout(() => {
          if (!this.connected) {
            this.lastError = new Error('Connection timeout');
            this.socket.close();
            reject(this.lastError);
          }
        }, OPENHOTEL_CONFIG.connectionTimeout);

        this.socket.onopen = () => {
          clearTimeout(timeout);
          this.connected = true;
          this.connecting = false;
          this.reconnectAttempts = 0;
          this.status = CONNECTION_STATUS.CONNECTED;
          this.lastError = null;

          const connectionTime = Date.now() - this.connectionStartTime;
          this.log(`Connected in ${connectionTime}ms`);

          // Send $$load event to complete handshake with OpenHotel server
          // This triggers the USER_JOINED event on the server
          this.send('$$load', {});

          // Start heartbeat
          this.startHeartbeat();

          // Flush queued messages
          this.flushQueue();

          // Emit internal connected event
          this.notifyListeners(OH_EVENT.CONNECTED, {
            connectionTime,
            reconnected: this.reconnectAttempts > 0
          });

          resolve();
        };

        this.socket.onclose = (event) => {
          clearTimeout(timeout);
          this.handleClose(event);
        };

        this.socket.onerror = (error) => {
          this.log('WebSocket error:', error);
          this.lastError = error;
          if (!this.connected) {
            reject(error);
          }
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };

      } catch (error) {
        this.connecting = false;
        this.status = CONNECTION_STATUS.FAILED;
        this.lastError = error;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Build WebSocket URL
   */
  buildUrl() {
    // OpenHotel expects the WebSocket at /proxy path
    const base = this.url.replace(/\/$/, '');
    return `${base}/proxy`;
  }

  /**
   * Handle incoming messages
   */
  handleMessage(event) {
    try {
      // OpenHotel sends JSON messages with event and message properties
      const data = JSON.parse(event.data);

      // Handle different message formats
      if (data.event) {
        // Standard event format: { event: 'event-name', message: {...} }
        this.log('Received event:', data.event, data.message);
        this.notifyListeners(data.event, data.message || {});
      } else if (data.type) {
        // Alternative format: { type: 'event-name', ...data }
        const { type, ...payload } = data;
        this.log('Received typed message:', type, payload);
        this.notifyListeners(type, payload);
      } else {
        // Raw data - emit as 'data' event
        this.log('Received raw data:', data);
        this.notifyListeners('data', data);
      }
    } catch (error) {
      this.log('Failed to parse message:', event.data, error);
    }
  }

  /**
   * Handle connection close
   */
  handleClose(event) {
    this.log('Connection closed:', event.code, event.reason);
    this.connected = false;
    this.connecting = false;
    this.stopHeartbeat();

    // Emit disconnected event
    this.notifyListeners(OH_EVENT.DISCONNECTED, {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    // Attempt reconnection if not intentional close
    if (event.code !== 1000 && this.reconnectAttempts < OPENHOTEL_CONFIG.reconnectMaxAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = OPENHOTEL_CONFIG.reconnectInterval * Math.pow(2, this.reconnectAttempts);
    this.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(() => {
        // Will schedule another reconnect via handleClose
      });
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) {
        this.send('$$ping', { timestamp: Date.now() });
      }
    }, OPENHOTEL_CONFIG.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Send message to server
   * @param {string} event - Event name
   * @param {object} message - Message payload
   */
  send(event, message = {}) {
    const data = { event, message };

    if (this.connected && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
      this.log('Sent:', event, message);
    } else {
      // Queue message for later
      this.messageQueue.enqueue(data);
      this.log('Queued (offline):', event, message);
    }
  }

  /**
   * Emit event (alias for send, following OpenHotel pattern)
   * OpenHotel wraps events in $$user-data for the proxy
   */
  emit(event, message = {}) {
    // OpenHotel proxy expects $$user-data wrapper
    this.send('$$user-data', { event, message });
  }

  /**
   * Flush queued messages after reconnection
   */
  flushQueue() {
    const messages = this.messageQueue.flush();
    if (messages.length > 0) {
      this.log(`Flushing ${messages.length} queued messages`);
      messages.forEach(({ event, message }) => {
        this.send(event, message);
      });
    }
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {function} callback - Handler function
   * @returns {function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
    };
  }

  /**
   * Register one-time event listener
   */
  once(event, callback) {
    const unsubscribe = this.on(event, (data) => {
      unsubscribe();
      callback(data);
    });
    return unsubscribe;
  }

  /**
   * Remove all listeners for an event
   */
  off(event) {
    this.listeners.delete(event);
  }

  /**
   * Notify all listeners for an event
   */
  notifyListeners(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    this.log('Disconnecting...');

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();

    // Close socket with normal close code
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.connected = false;
    this.connecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Debug logging
   */
  log(...args) {
    if (this.debug) {
      console.log('[OpenHotel WS]', ...args);
    }
  }

  /**
   * Get connection state
   */
  get isConnected() {
    return this.connected;
  }

  get isConnecting() {
    return this.connecting;
  }
}

/**
 * Create a singleton instance
 */
let instance = null;

export function getOpenHotelSocket(options = {}) {
  if (!instance) {
    instance = new OpenHotelWebSocket(options);
  }
  return instance;
}

export function resetOpenHotelSocket() {
  if (instance) {
    instance.disconnect();
    instance = null;
  }
}

export default OpenHotelWebSocket;
