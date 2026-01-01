/**
 * OpenHotel Context Provider
 *
 * Central provider for OpenHotel integration. Manages connection state,
 * authentication, and provides hooks for room/avatar/chat functionality.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getOpenHotelSocket, resetOpenHotelSocket } from './adapters/websocketAdapter';
import { getAuthAdapter, resetAuthAdapter } from './adapters/authAdapter';
import { getCurrencyAdapter, resetCurrencyAdapter } from './adapters/currencyAdapter';
import { getAvatarAdapter } from './adapters/avatarAdapter';
import { OPENHOTEL_CONFIG, OH_EVENT } from './config';

// Create context
const OpenHotelContext = createContext(null);

/**
 * Connection states
 */
export const CONNECTION_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

/**
 * OpenHotel Provider Component
 */
export function OpenHotelProvider({ children }) {
  const { user } = useAuth();

  // Connection state
  const [connectionState, setConnectionState] = useState(CONNECTION_STATE.DISCONNECTED);
  const [connectionError, setConnectionError] = useState(null);

  // Room state
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomUsers, setRoomUsers] = useState([]);
  const [roomFurniture, setRoomFurniture] = useState([]);
  const [roomMessages, setRoomMessages] = useState([]);

  // User's hotel data
  const [hotelAccount, setHotelAccount] = useState(null);
  const [inventory, setInventory] = useState([]);

  // Adapters
  const socketRef = useRef(null);
  const authAdapterRef = useRef(null);
  const currencyAdapterRef = useRef(null);
  const avatarAdapterRef = useRef(null);

  // Event cleanup functions
  const eventCleanupRef = useRef([]);

  /**
   * Initialize adapters
   */
  useEffect(() => {
    if (OPENHOTEL_CONFIG.enabled) {
      socketRef.current = getOpenHotelSocket();
      authAdapterRef.current = getAuthAdapter();
      currencyAdapterRef.current = getCurrencyAdapter();
      avatarAdapterRef.current = getAvatarAdapter();
    }

    return () => {
      // Cleanup on unmount
      resetOpenHotelSocket();
      resetAuthAdapter();
      resetCurrencyAdapter();
    };
  }, []);

  /**
   * Connect to OpenHotel server
   */
  const connect = useCallback(async () => {
    if (!OPENHOTEL_CONFIG.enabled) {
      console.warn('OpenHotel integration is disabled');
      return false;
    }

    if (!user) {
      console.warn('Cannot connect to OpenHotel: User not authenticated');
      return false;
    }

    try {
      setConnectionState(CONNECTION_STATE.CONNECTING);
      setConnectionError(null);

      // Get auth credentials
      const credentials = await authAdapterRef.current.generateCredentials();

      // Configure socket with credentials
      socketRef.current.protocols = [credentials.accountId, credentials.username];

      // Connect
      await socketRef.current.connect();

      // Store hotel account info
      setHotelAccount({
        accountId: credentials.accountId,
        username: credentials.username,
        ...credentials.metadata
      });

      setConnectionState(CONNECTION_STATE.CONNECTED);
      return true;

    } catch (error) {
      console.error('OpenHotel connection failed:', error);
      setConnectionState(CONNECTION_STATE.ERROR);
      setConnectionError(error.message);
      return false;
    }
  }, [user]);

  /**
   * Disconnect from OpenHotel server
   */
  const disconnect = useCallback(() => {
    // Leave current room if in one
    if (currentRoom) {
      socketRef.current?.emit(OH_EVENT.LEAVE_ROOM, {});
    }

    // Disconnect socket
    socketRef.current?.disconnect();

    // Clear state
    setConnectionState(CONNECTION_STATE.DISCONNECTED);
    setCurrentRoom(null);
    setRoomUsers([]);
    setRoomFurniture([]);
    setRoomMessages([]);
    setHotelAccount(null);

  }, [currentRoom]);

  /**
   * Join a room
   */
  const joinRoom = useCallback(async (roomId) => {
    if (connectionState !== CONNECTION_STATE.CONNECTED) {
      const connected = await connect();
      if (!connected) {
        throw new Error('Failed to connect to OpenHotel');
      }
    }

    // Send pre-join to get room preview
    socketRef.current.emit(OH_EVENT.PRE_JOIN_ROOM, { roomId });

    // Wait for room data
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Room join timeout'));
      }, 10000);

      const unsubscribe = socketRef.current.once(OH_EVENT.LOAD_ROOM, (data) => {
        clearTimeout(timeout);
        setCurrentRoom(data);
        setRoomUsers(data.users || []);
        setRoomFurniture(data.furniture || []);
        resolve(data);
      });

      // Handle join error
      const unsubError = socketRef.current.once('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(error.message || 'Failed to join room'));
      });
    });
  }, [connectionState, connect]);

  /**
   * Leave current room
   */
  const leaveRoom = useCallback(() => {
    if (!currentRoom) return;

    socketRef.current.emit(OH_EVENT.LEAVE_ROOM, {});
    setCurrentRoom(null);
    setRoomUsers([]);
    setRoomFurniture([]);
    setRoomMessages([]);
  }, [currentRoom]);

  /**
   * Send chat message
   */
  const sendMessage = useCallback((text, type = 'chat') => {
    if (!currentRoom) return;

    socketRef.current.emit(OH_EVENT.MESSAGE, {
      message: text,
      type
    });
  }, [currentRoom]);

  /**
   * Move avatar to tile
   */
  const moveToTile = useCallback((position) => {
    if (!currentRoom) return;

    socketRef.current.emit(OH_EVENT.POINTER_TILE, {
      position
    });
  }, [currentRoom]);

  /**
   * Place furniture item
   */
  const placeFurniture = useCallback((furnitureId, position, direction = 0) => {
    if (!currentRoom) return;

    socketRef.current.emit(OH_EVENT.PLACE_ITEM, {
      furnitureId,
      position,
      direction
    });
  }, [currentRoom]);

  /**
   * Pick up furniture
   */
  const pickupFurniture = useCallback((furnitureId) => {
    if (!currentRoom) return;

    socketRef.current.emit(OH_EVENT.PICK_UP_FURNITURE, {
      id: furnitureId
    });
  }, [currentRoom]);

  /**
   * Setup event listeners
   */
  useEffect(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    // Connection events
    const unsubConnected = socket.on(OH_EVENT.CONNECTED, () => {
      setConnectionState(CONNECTION_STATE.CONNECTED);
    });

    const unsubDisconnected = socket.on(OH_EVENT.DISCONNECTED, () => {
      setConnectionState(CONNECTION_STATE.DISCONNECTED);
      setCurrentRoom(null);
    });

    // Room events
    const unsubAddHuman = socket.on(OH_EVENT.ADD_HUMAN, (data) => {
      setRoomUsers(prev => [...prev, data]);
    });

    const unsubRemoveHuman = socket.on(OH_EVENT.REMOVE_HUMAN, (data) => {
      setRoomUsers(prev =>
        prev.filter(u => u.accountId !== data.accountId)
      );
    });

    const unsubMoveHuman = socket.on(OH_EVENT.MOVE_HUMAN, (data) => {
      setRoomUsers(prev =>
        prev.map(u =>
          u.accountId === data.accountId
            ? { ...u, targetPosition: data.position, bodyDirection: data.bodyDirection }
            : u
        )
      );
    });

    // Furniture events
    const unsubAddFurniture = socket.on(OH_EVENT.ADD_FURNITURE, (data) => {
      setRoomFurniture(prev => [...prev, data.furniture]);
    });

    const unsubRemoveFurniture = socket.on(OH_EVENT.REMOVE_FURNITURE, (data) => {
      const idsToRemove = Array.isArray(data.furniture)
        ? data.furniture.map(f => f.id)
        : [data.furniture.id];
      setRoomFurniture(prev =>
        prev.filter(f => !idsToRemove.includes(f.id))
      );
    });

    const unsubUpdateFurniture = socket.on(OH_EVENT.UPDATE_FURNITURE, (data) => {
      setRoomFurniture(prev =>
        prev.map(f => f.id === data.furniture.id ? data.furniture : f)
      );
    });

    // Chat events
    const unsubMessage = socket.on(OH_EVENT.MESSAGE, (data) => {
      setRoomMessages(prev => [...prev.slice(-99), {
        ...data,
        timestamp: Date.now()
      }]);
    });

    const unsubSystemMessage = socket.on(OH_EVENT.SYSTEM_MESSAGE, (data) => {
      setRoomMessages(prev => [...prev.slice(-99), {
        ...data,
        type: 'system',
        timestamp: Date.now()
      }]);
    });

    // Store cleanup functions
    eventCleanupRef.current = [
      unsubConnected,
      unsubDisconnected,
      unsubAddHuman,
      unsubRemoveHuman,
      unsubMoveHuman,
      unsubAddFurniture,
      unsubRemoveFurniture,
      unsubUpdateFurniture,
      unsubMessage,
      unsubSystemMessage
    ];

    return () => {
      eventCleanupRef.current.forEach(unsub => unsub?.());
      eventCleanupRef.current = [];
    };
  }, []);

  /**
   * Auto-disconnect on user logout
   */
  useEffect(() => {
    if (!user && connectionState === CONNECTION_STATE.CONNECTED) {
      disconnect();
    }
  }, [user, connectionState, disconnect]);

  /**
   * Context value
   */
  const value = useMemo(() => ({
    // State
    isEnabled: OPENHOTEL_CONFIG.enabled,
    connectionState,
    connectionError,
    isConnected: connectionState === CONNECTION_STATE.CONNECTED,
    isConnecting: connectionState === CONNECTION_STATE.CONNECTING,

    // Hotel account
    hotelAccount,
    inventory,

    // Room state
    currentRoom,
    roomUsers,
    roomFurniture,
    roomMessages,

    // Actions
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendMessage,
    moveToTile,
    placeFurniture,
    pickupFurniture,

    // Adapters (for advanced use)
    getSocket: () => socketRef.current,
    getAuthAdapter: () => authAdapterRef.current,
    getCurrencyAdapter: () => currencyAdapterRef.current,
    getAvatarAdapter: () => avatarAdapterRef.current,

    // Config
    config: OPENHOTEL_CONFIG
  }), [
    connectionState,
    connectionError,
    hotelAccount,
    inventory,
    currentRoom,
    roomUsers,
    roomFurniture,
    roomMessages,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendMessage,
    moveToTile,
    placeFurniture,
    pickupFurniture
  ]);

  return (
    <OpenHotelContext.Provider value={value}>
      {children}
    </OpenHotelContext.Provider>
  );
}

/**
 * Hook to access OpenHotel context
 */
export function useOpenHotel() {
  const context = useContext(OpenHotelContext);
  if (!context) {
    throw new Error('useOpenHotel must be used within an OpenHotelProvider');
  }
  return context;
}

/**
 * Hook to check if OpenHotel is enabled
 */
export function useOpenHotelEnabled() {
  return OPENHOTEL_CONFIG.enabled;
}

export default OpenHotelProvider;
