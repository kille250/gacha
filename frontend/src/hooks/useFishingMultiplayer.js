/**
 * Fishing Multiplayer Hook
 * 
 * Handles WebSocket connection for multiplayer fishing.
 * Manages other players' state and broadcasts local player state.
 * 
 * USAGE:
 * const { otherPlayers, isConnected, playerCount } = useFishingMultiplayer({
 *   playerPos,
 *   playerDir,
 *   gameState,
 *   lastResult
 * });
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { WS_URL } from '../utils/api';
import { getToken, getUserIdFromToken } from '../utils/authStorage';
import { FISHING_TIMING } from '../constants/fishingConstants';

/**
 * Hook for managing multiplayer WebSocket connection
 * @param {Object} options - Configuration options
 * @param {Object} options.playerPos - Current player position { x, y }
 * @param {string} options.playerDir - Current player direction
 * @param {string} options.gameState - Current game state
 * @param {Object} options.lastResult - Last fishing result
 * @param {Function} options.onDuplicateSession - Callback when duplicate session detected
 * @param {Function} options.onDisconnect - Callback when disconnected
 * @returns {Object} Multiplayer state and controls
 */
export function useFishingMultiplayer({
  playerPos,
  playerDir,
  gameState,
  lastResult,
  onDuplicateSession,
  onDisconnect,
}) {
  const [otherPlayers, setOtherPlayers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef(null);
  const lastPositionRef = useRef({ x: 10, y: 6, direction: 'down' });
  const currentUserIdRef = useRef(null);
  
  // Store callbacks in refs to avoid dependency issues
  const onDisconnectRef = useRef(onDisconnect);
  const onDuplicateSessionRef = useRef(onDuplicateSession);
  
  useEffect(() => {
    onDisconnectRef.current = onDisconnect;
    onDuplicateSessionRef.current = onDuplicateSession;
  }, [onDisconnect, onDuplicateSession]);

  // Initialize WebSocket connection
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    
    currentUserIdRef.current = getUserIdFromToken();
    
    // Connect to fishing namespace
    const socket = io(`${WS_URL}/fishing`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = socket;
    
    // Connection handlers
    socket.on('connect', () => {
      console.log('[Multiplayer] Connected to fishing server');
      setIsConnected(true);
    });
    
    socket.on('disconnect', () => {
      console.log('[Multiplayer] Disconnected from fishing server');
      setIsConnected(false);
      setOtherPlayers([]);
      onDisconnectRef.current?.();
    });
    
    socket.on('connect_error', (err) => {
      console.log('[Multiplayer] Connection error:', err.message);
      setIsConnected(false);
    });
    
    // Duplicate session handling
    socket.on('duplicate_session', (data) => {
      console.log('[Multiplayer] Duplicate session detected:', data.message);
      onDuplicateSessionRef.current?.(data.message);
    });
    
    // Initialize with existing players
    socket.on('init', (data) => {
      console.log('[Multiplayer] Initialized with', data.players.length, 'players');
      const filteredPlayers = data.players.filter(p => p.id !== currentUserIdRef.current);
      setOtherPlayers(filteredPlayers);
    });
    
    // Player joined
    socket.on('player_joined', (player) => {
      if (player.id === currentUserIdRef.current) {
        console.log('[Multiplayer] Ignoring self-join event');
        return;
      }
      console.log('[Multiplayer] Player joined:', player.username);
      setOtherPlayers(prev => {
        if (prev.find(p => p.id === player.id)) {
          console.log('[Multiplayer] Player already in list, skipping');
          return prev;
        }
        return [...prev, player];
      });
    });
    
    // Player left
    socket.on('player_left', (data) => {
      if (data.id === currentUserIdRef.current) {
        console.log('[Multiplayer] Ignoring self-leave event');
        return;
      }
      console.log('[Multiplayer] Player left:', data.id);
      setOtherPlayers(prev => prev.filter(p => p.id !== data.id));
    });
    
    // Player moved
    socket.on('player_moved', (data) => {
      setOtherPlayers(prev => prev.map(p =>
        p.id === data.id
          ? { ...p, x: data.x, y: data.y, direction: data.direction }
          : p
      ));
    });
    
    // Player state changed
    socket.on('player_state', (data) => {
      setOtherPlayers(prev => prev.map(p =>
        p.id === data.id
          ? { ...p, state: data.state, lastFish: data.fish, success: data.success }
          : p
      ));
    });
    
    // Player emote
    socket.on('player_emote', (data) => {
      setOtherPlayers(prev => prev.map(p =>
        p.id === data.id
          ? { ...p, emote: data.emote, emoteTime: Date.now() }
          : p
      ));
    });
    
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Empty deps - single connection for component lifetime
  
  // Send position updates
  useEffect(() => {
    if (!socketRef.current || !isConnected) return;
    
    const pos = lastPositionRef.current;
    if (pos.x !== playerPos.x || pos.y !== playerPos.y || pos.direction !== playerDir) {
      socketRef.current.emit('move', {
        x: playerPos.x,
        y: playerPos.y,
        direction: playerDir,
      });
      lastPositionRef.current = { x: playerPos.x, y: playerPos.y, direction: playerDir };
    }
  }, [playerPos, playerDir, isConnected]);
  
  // Send game state changes
  useEffect(() => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('state_change', {
      state: gameState,
      fish: lastResult?.fish,
      success: lastResult?.success,
    });
  }, [gameState, isConnected, lastResult]);
  
  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!socketRef.current || !isConnected) return;
    
    const heartbeatInterval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('heartbeat');
      }
    }, FISHING_TIMING.heartbeatInterval);
    
    return () => clearInterval(heartbeatInterval);
  }, [isConnected]);
  
  // Send emote
  const sendEmote = useCallback((emote) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('emote', { emote });
    }
  }, []);
  
  // Disconnect (for cleanup)
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);
  
  return {
    otherPlayers,
    isConnected,
    playerCount: otherPlayers.length + 1,
    sendEmote,
    disconnect,
  };
}

export default useFishingMultiplayer;

