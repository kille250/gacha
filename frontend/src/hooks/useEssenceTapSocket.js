/**
 * useEssenceTapSocket - WebSocket hook for Essence Tap real-time synchronization
 *
 * Provides WebSocket connectivity for the Essence Tap clicker game,
 * with automatic reconnection, tap batching, and state reconciliation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { WS_URL } from '../utils/api';

// ===========================================
// CONFIGURATION
// ===========================================

const CONFIG = {
  // Reconnection settings
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_BASE_DELAY: 1000,
  RECONNECT_MAX_DELAY: 30000,

  // Tap batching
  TAP_BATCH_INTERVAL_MS: 50,
  MAX_PENDING_TAPS: 50,

  // Sync settings
  STALE_STATE_THRESHOLD_MS: 60000,

  // Action queue for offline support
  MAX_QUEUED_ACTIONS: 100,

  // Reconnection sync delay - wait for server to stabilize before syncing
  RECONNECT_SYNC_DELAY_MS: 100,
};

// ===========================================
// CONNECTION STATES
// ===========================================

export const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
};

// ===========================================
// HOOK IMPLEMENTATION
// ===========================================

/**
 * WebSocket hook for Essence Tap real-time synchronization
 *
 * @param {Object} options
 * @param {string} options.token - JWT auth token
 * @param {string} [options.serverUrl] - WebSocket server URL (defaults to window.location)
 * @param {boolean} [options.autoConnect=true] - Whether to connect automatically
 * @param {Function} [options.onStateUpdate] - Callback when state updates
 * @param {Function} [options.onError] - Callback when errors occur
 * @param {Function} [options.onChallengeComplete] - Callback when challenge completes
 */
export function useEssenceTapSocket(options = {}) {
  const {
    token,
    serverUrl,
    autoConnect = true,
    onStateUpdate,
    onError,
    onChallengeComplete,
  } = options;

  // Connection state
  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.DISCONNECTED);
  const [isConnected, setIsConnected] = useState(false);

  // Game state (synced from server)
  const [essenceState, setEssenceState] = useState(null);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(0);

  // Refs for socket and state management
  const socketRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);

  // Refs for callbacks to prevent reconnection loops when callbacks change
  const onStateUpdateRef = useRef(onStateUpdate);
  const onErrorRef = useRef(onError);
  const onChallengeCompleteRef = useRef(onChallengeComplete);

  // Keep refs updated with latest callbacks
  onStateUpdateRef.current = onStateUpdate;
  onErrorRef.current = onError;
  onChallengeCompleteRef.current = onChallengeComplete;

  // Tap batching refs
  const pendingTapsRef = useRef({ count: 0, comboMultiplier: 1, clientSeqs: [] });
  const tapBatchTimerRef = useRef(null);
  const clientSeqRef = useRef(0);

  // Track confirmed sequences for reconciliation
  const confirmedSeqRef = useRef(0);

  // Pending actions queue (for offline support)
  const pendingActionsRef = useRef([]);

  // Optimistic updates tracking
  const optimisticUpdatesRef = useRef(new Map());

  // Track total optimistic essence added (for proper reconciliation)
  const optimisticEssenceRef = useRef(0);

  // Track reconnection state for sync coordination
  const isReconnectingRef = useRef(false);

  // ===========================================
  // CONNECTION MANAGEMENT
  // ===========================================

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    if (!token) {
      console.warn('[EssenceTap WS] No token provided, cannot connect');
      setConnectionState(CONNECTION_STATES.ERROR);
      return;
    }

    setConnectionState(CONNECTION_STATES.CONNECTING);

    // Use provided serverUrl, or fallback to the API's WS_URL
    const url = serverUrl || WS_URL;

    console.log('[EssenceTap WS] Connecting to:', `${url}/essence-tap`);

    const socket = io(`${url}/essence-tap`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: false, // We handle reconnection ourselves
    });

    socketRef.current = socket;

    // ===========================================
    // SOCKET EVENT HANDLERS
    // ===========================================

    socket.on('connect', () => {
      console.log('[EssenceTap WS] Connected');
      setConnectionState(CONNECTION_STATES.CONNECTED);
      setIsConnected(true);
      reconnectAttemptRef.current = 0;

      // CRITICAL: Clear optimistic updates on reconnect
      // Server will send fresh state via state_full, making old optimistic updates stale
      optimisticUpdatesRef.current.clear();
      optimisticEssenceRef.current = 0;

      // Reset pending taps - server state_full will be authoritative
      pendingTapsRef.current = { count: 0, comboMultiplier: 1, clientSeqs: [] };
      if (tapBatchTimerRef.current) {
        clearTimeout(tapBatchTimerRef.current);
        tapBatchTimerRef.current = null;
      }

      // If this is a reconnection (not initial connection), request a full sync
      // after a small delay to ensure server is ready
      if (isReconnectingRef.current) {
        isReconnectingRef.current = false;
        setTimeout(() => {
          if (socket.connected) {
            console.log('[EssenceTap WS] Requesting sync after reconnection');
            socket.emit('sync_request');
          }
        }, CONFIG.RECONNECT_SYNC_DELAY_MS);
      }

      // Replay any queued actions (only non-tap actions should be queued)
      if (pendingActionsRef.current.length > 0) {
        // Filter out tap actions - server state will already include them via offline calculation
        const nonTapActions = pendingActionsRef.current.filter(a => a.type !== 'tap');
        if (nonTapActions.length > 0) {
          console.log(`[EssenceTap WS] Replaying ${nonTapActions.length} queued non-tap actions`);
          nonTapActions.forEach(action => {
            socket.emit(action.type, action.data);
          });
        }
        pendingActionsRef.current = [];
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[EssenceTap WS] Disconnected:', reason);
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        // Server disconnected us, don't reconnect
        setConnectionState(CONNECTION_STATES.DISCONNECTED);
      } else {
        // Mark as reconnecting so connect handler knows to request sync
        isReconnectingRef.current = true;
        // Try to reconnect
        scheduleReconnect();
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[EssenceTap WS] Connection error:', err.message);
      setConnectionState(CONNECTION_STATES.ERROR);
      setIsConnected(false);
      scheduleReconnect();
    });

    // ===========================================
    // STATE SYNC HANDLERS
    // ===========================================

    socket.on('state_full', (data) => {
      console.log('[EssenceTap WS] Received full state sync');
      setEssenceState(data);
      setLastSyncTimestamp(data.serverTimestamp || Date.now());
      confirmedSeqRef.current = data.seq || 0;

      // Clear optimistic updates - server state is authoritative
      optimisticUpdatesRef.current.clear();
      optimisticEssenceRef.current = 0;

      if (onStateUpdateRef.current) {
        onStateUpdateRef.current(data, 'full');
      }
    });

    socket.on('state_delta', (data) => {
      setEssenceState(prev => {
        if (!prev) return data;

        const updated = { ...prev };

        // Apply delta updates
        if (data.essence !== undefined) updated.essence = data.essence;
        if (data.lifetimeEssence !== undefined) updated.lifetimeEssence = data.lifetimeEssence;
        if (data.generators !== undefined) updated.generators = data.generators;
        if (data.purchasedUpgrades !== undefined) updated.purchasedUpgrades = data.purchasedUpgrades;
        if (data.productionPerSecond !== undefined) updated.productionPerSecond = data.productionPerSecond;
        if (data.clickPower !== undefined) updated.clickPower = data.clickPower;
        if (data.critChance !== undefined) updated.critChance = data.critChance;
        if (data.critMultiplier !== undefined) updated.critMultiplier = data.critMultiplier;
        if (data.totalClicks !== undefined) updated.totalClicks = data.totalClicks;

        return updated;
      });

      setLastSyncTimestamp(data.serverTimestamp || Date.now());

      // Remove confirmed optimistic update
      if (data.confirmedClientSeq !== undefined) {
        optimisticUpdatesRef.current.delete(data.confirmedClientSeq);
      }

      if (data.seq !== undefined) {
        confirmedSeqRef.current = data.seq;
      }

      if (onStateUpdateRef.current) {
        onStateUpdateRef.current(data, 'delta');
      }
    });

    socket.on('tap_confirmed', (data) => {
      setEssenceState(prev => {
        if (!prev) return prev;

        // Server state is authoritative for confirmed taps
        // Reset optimistic tracking since server has processed these taps
        return {
          ...prev,
          essence: data.essence,
          lifetimeEssence: data.lifetimeEssence,
          totalClicks: data.totalClicks,
        };
      });

      setLastSyncTimestamp(data.serverTimestamp || Date.now());

      // Remove confirmed optimistic updates and calculate remaining optimistic essence
      if (data.confirmedClientSeqs) {
        let confirmedEssence = 0;
        data.confirmedClientSeqs.forEach(seq => {
          const update = optimisticUpdatesRef.current.get(seq);
          if (update && update.estimatedGain) {
            confirmedEssence += update.estimatedGain;
          }
          optimisticUpdatesRef.current.delete(seq);
        });
        // Reduce tracked optimistic essence by confirmed amount
        optimisticEssenceRef.current = Math.max(0, optimisticEssenceRef.current - confirmedEssence);
      }

      if (data.seq !== undefined) {
        confirmedSeqRef.current = data.seq;
      }

      // Handle completed challenges
      if (data.completedChallenges?.length > 0 && onChallengeCompleteRef.current) {
        data.completedChallenges.forEach(challenge => {
          onChallengeCompleteRef.current(challenge);
        });
      }

      if (onStateUpdateRef.current) {
        onStateUpdateRef.current(data, 'tap_confirmed');
      }
    });

    socket.on('action_rejected', (data) => {
      console.warn('[EssenceTap WS] Action rejected:', data.reason);

      // Roll back optimistic update if we have one
      if (data.clientSeq !== undefined && optimisticUpdatesRef.current.has(data.clientSeq)) {
        const rollback = optimisticUpdatesRef.current.get(data.clientSeq);
        if (rollback) {
          setEssenceState(prev => ({
            ...prev,
            ...rollback,
          }));
        }
        optimisticUpdatesRef.current.delete(data.clientSeq);
      }

      // Apply correct state if provided
      if (data.correctState) {
        setEssenceState(prev => ({
          ...prev,
          ...data.correctState,
        }));
      }

      if (onErrorRef.current) {
        onErrorRef.current({ type: 'action_rejected', ...data });
      }
    });

    socket.on('error', (data) => {
      console.error('[EssenceTap WS] Server error:', data);
      if (onErrorRef.current) {
        onErrorRef.current(data);
      }
    });

    socket.on('ping', () => {
      socket.emit('pong');
    });

    // ===========================================
    // PRESTIGE HANDLER
    // ===========================================

    socket.on('prestige_complete', (data) => {
      console.log('[EssenceTap WS] Prestige complete');
      setEssenceState(data);
      setLastSyncTimestamp(data.serverTimestamp || Date.now());

      if (data.confirmedClientSeq !== undefined) {
        optimisticUpdatesRef.current.delete(data.confirmedClientSeq);
      }
      if (data.seq !== undefined) {
        confirmedSeqRef.current = data.seq;
      }

      if (onStateUpdateRef.current) {
        onStateUpdateRef.current(data, 'prestige_complete');
      }
    });

    // ===========================================
    // ABILITY ACTIVATION HANDLER
    // ===========================================

    socket.on('ability_activated', (data) => {
      setEssenceState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          essence: data.essence,
          activeAbilities: data.activeAbilities,
        };
      });

      setLastSyncTimestamp(data.serverTimestamp || Date.now());

      if (data.confirmedClientSeq !== undefined) {
        optimisticUpdatesRef.current.delete(data.confirmedClientSeq);
      }
      if (data.seq !== undefined) {
        confirmedSeqRef.current = data.seq;
      }

      if (onStateUpdateRef.current) {
        onStateUpdateRef.current(data, 'ability_activated');
      }
    });

    // ===========================================
    // GAMBLE RESULT HANDLER
    // ===========================================

    socket.on('gamble_result', (data) => {
      console.log('[EssenceTap WS] Gamble result:', data.won ? 'WIN' : 'LOSS');
      setEssenceState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          essence: data.newEssence,
          gambleInfo: data.gambleInfo,
        };
      });

      setLastSyncTimestamp(data.serverTimestamp || Date.now());

      if (data.confirmedClientSeq !== undefined) {
        optimisticUpdatesRef.current.delete(data.confirmedClientSeq);
      }
      if (data.seq !== undefined) {
        confirmedSeqRef.current = data.seq;
      }

      if (onStateUpdateRef.current) {
        onStateUpdateRef.current(data, 'gamble_result');
      }
    });

    // ===========================================
    // INFUSION RESULT HANDLER
    // ===========================================

    socket.on('infusion_complete', (data) => {
      console.log('[EssenceTap WS] Infusion complete, new bonus:', data.totalBonus);
      setEssenceState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          essence: data.essence,
          infusionBonus: data.totalBonus,
          infusionCount: data.infusionCount,
        };
      });

      setLastSyncTimestamp(data.serverTimestamp || Date.now());

      if (data.confirmedClientSeq !== undefined) {
        optimisticUpdatesRef.current.delete(data.confirmedClientSeq);
      }
      if (data.seq !== undefined) {
        confirmedSeqRef.current = data.seq;
      }

      if (onStateUpdateRef.current) {
        onStateUpdateRef.current(data, 'infusion_complete');
      }
    });
  // Note: scheduleReconnect is excluded intentionally - it's stable and defined outside
  // Callbacks are accessed via refs to prevent reconnection loops when they change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, serverUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (tapBatchTimerRef.current) {
      clearTimeout(tapBatchTimerRef.current);
      tapBatchTimerRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setConnectionState(CONNECTION_STATES.DISCONNECTED);
    setIsConnected(false);
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptRef.current >= CONFIG.RECONNECT_ATTEMPTS) {
      console.log('[EssenceTap WS] Max reconnection attempts reached');
      setConnectionState(CONNECTION_STATES.ERROR);
      return;
    }

    setConnectionState(CONNECTION_STATES.RECONNECTING);

    const delay = Math.min(
      CONFIG.RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptRef.current),
      CONFIG.RECONNECT_MAX_DELAY
    );

    reconnectAttemptRef.current++;
    console.log(`[EssenceTap WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`);

    reconnectTimerRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      connect();
    }, delay);
  }, [connect]);

  // ===========================================
  // TAP HANDLING WITH BATCHING
  // ===========================================

  const sendTap = useCallback((count = 1, comboMultiplier = 1) => {
    // Generate client sequence number for this tap
    const clientSeq = ++clientSeqRef.current;

    // Add to pending batch
    pendingTapsRef.current.count += count;
    pendingTapsRef.current.comboMultiplier = Math.max(
      pendingTapsRef.current.comboMultiplier,
      comboMultiplier
    );
    pendingTapsRef.current.clientSeqs.push(clientSeq);

    // Calculate optimistic essence gain
    const clickPower = essenceState?.clickPower || 1;
    const estimatedGain = Math.floor(clickPower * comboMultiplier) * count;

    // Store optimistic update for potential rollback (including estimated gain for reconciliation)
    optimisticUpdatesRef.current.set(clientSeq, {
      essence: essenceState?.essence || 0,
      lifetimeEssence: essenceState?.lifetimeEssence || 0,
      estimatedGain, // Track for proper reconciliation
    });

    // Track total optimistic essence for state reconciliation
    optimisticEssenceRef.current += estimatedGain;

    // Apply optimistic update
    setEssenceState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        essence: (prev.essence || 0) + estimatedGain,
        lifetimeEssence: (prev.lifetimeEssence || 0) + estimatedGain,
        totalClicks: (prev.totalClicks || 0) + count,
      };
    });

    // Clear existing batch timer
    if (tapBatchTimerRef.current) {
      clearTimeout(tapBatchTimerRef.current);
    }

    // If batch is full or we have too many pending taps, send immediately
    if (pendingTapsRef.current.count >= CONFIG.MAX_PENDING_TAPS) {
      flushTapBatch();
      return clientSeq;
    }

    // Schedule batch send
    tapBatchTimerRef.current = setTimeout(() => {
      flushTapBatch();
    }, CONFIG.TAP_BATCH_INTERVAL_MS);

    return clientSeq;
  // Note: flushTapBatch is called via closure reference in setTimeout, not as dependency
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [essenceState]);

  const flushTapBatch = useCallback(() => {
    if (pendingTapsRef.current.count === 0) return;

    const batch = { ...pendingTapsRef.current };
    pendingTapsRef.current = { count: 0, comboMultiplier: 1, clientSeqs: [] };

    if (tapBatchTimerRef.current) {
      clearTimeout(tapBatchTimerRef.current);
      tapBatchTimerRef.current = null;
    }

    const data = {
      count: batch.count,
      comboMultiplier: batch.comboMultiplier,
      clientSeqs: batch.clientSeqs,
    };

    if (socketRef.current?.connected) {
      socketRef.current.emit('tap', data);
    } else {
      // Queue for later if disconnected
      if (pendingActionsRef.current.length < CONFIG.MAX_QUEUED_ACTIONS) {
        pendingActionsRef.current.push({ type: 'tap', data });
      }
    }
  }, []);

  // ===========================================
  // ACTION METHODS
  // ===========================================

  const purchaseGenerator = useCallback((generatorId, count = 1) => {
    const clientSeq = ++clientSeqRef.current;

    // Flush any pending taps first
    flushTapBatch();

    const data = { generatorId, count, clientSeq };

    if (socketRef.current?.connected) {
      socketRef.current.emit('purchase_generator', data);
    } else {
      if (pendingActionsRef.current.length < CONFIG.MAX_QUEUED_ACTIONS) {
        pendingActionsRef.current.push({ type: 'purchase_generator', data });
      }
    }

    return clientSeq;
  }, [flushTapBatch]);

  const purchaseUpgrade = useCallback((upgradeId) => {
    const clientSeq = ++clientSeqRef.current;

    // Flush any pending taps first
    flushTapBatch();

    const data = { upgradeId, clientSeq };

    if (socketRef.current?.connected) {
      socketRef.current.emit('purchase_upgrade', data);
    } else {
      if (pendingActionsRef.current.length < CONFIG.MAX_QUEUED_ACTIONS) {
        pendingActionsRef.current.push({ type: 'purchase_upgrade', data });
      }
    }

    return clientSeq;
  }, [flushTapBatch]);

  const requestSync = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('sync_request');
    }
  }, []);

  const performPrestige = useCallback(() => {
    const clientSeq = ++clientSeqRef.current;

    // Flush any pending taps first
    flushTapBatch();

    if (socketRef.current?.connected) {
      socketRef.current.emit('prestige', { clientSeq });
      return { sent: true, clientSeq };
    } else {
      // For prestige, don't queue - require WebSocket connection
      return { sent: false, reason: 'disconnected' };
    }
  }, [flushTapBatch]);

  const activateAbility = useCallback((abilityId) => {
    const clientSeq = ++clientSeqRef.current;

    if (socketRef.current?.connected) {
      socketRef.current.emit('activate_ability', { abilityId, clientSeq });
      return { sent: true, clientSeq };
    } else {
      // Queue for later if disconnected
      if (pendingActionsRef.current.length < CONFIG.MAX_QUEUED_ACTIONS) {
        pendingActionsRef.current.push({
          type: 'activate_ability',
          data: { abilityId, clientSeq }
        });
        return { sent: false, queued: true, clientSeq };
      }
      return { sent: false, queued: false, reason: 'queue_full' };
    }
  }, []);

  const performGamble = useCallback((betType, betAmount) => {
    const clientSeq = ++clientSeqRef.current;

    // Flush any pending taps first
    flushTapBatch();

    if (socketRef.current?.connected) {
      socketRef.current.emit('gamble', { betType, betAmount, clientSeq });
      return { sent: true, clientSeq };
    } else {
      // For gamble, don't queue - require WebSocket connection
      return { sent: false, reason: 'disconnected' };
    }
  }, [flushTapBatch]);

  const performInfusion = useCallback(() => {
    const clientSeq = ++clientSeqRef.current;

    // Flush any pending taps first
    flushTapBatch();

    if (socketRef.current?.connected) {
      socketRef.current.emit('infusion', { clientSeq });
      return { sent: true, clientSeq };
    } else {
      // For infusion, don't queue - require WebSocket connection
      return { sent: false, reason: 'disconnected' };
    }
  }, [flushTapBatch]);

  // ===========================================
  // LIFECYCLE
  // ===========================================

  useEffect(() => {
    if (autoConnect && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, token, connect, disconnect]);

  // Flush pending taps before unmount
  useEffect(() => {
    return () => {
      if (pendingTapsRef.current.count > 0) {
        flushTapBatch();
      }
    };
  }, [flushTapBatch]);

  // CRITICAL: Flush pending taps before page unload/reload
  // This ensures no taps are lost when the user refreshes or navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Synchronously flush any pending taps before the page unloads
      if (pendingTapsRef.current.count > 0 && socketRef.current?.connected) {
        const batch = { ...pendingTapsRef.current };
        pendingTapsRef.current = { count: 0, comboMultiplier: 1, clientSeqs: [] };

        if (tapBatchTimerRef.current) {
          clearTimeout(tapBatchTimerRef.current);
          tapBatchTimerRef.current = null;
        }

        // Send synchronously before unload
        socketRef.current.emit('tap', {
          count: batch.count,
          comboMultiplier: batch.comboMultiplier,
          clientSeqs: batch.clientSeqs,
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    // Also listen to pagehide for mobile browsers
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, []);

  // ===========================================
  // RETURN VALUES
  // ===========================================

  return {
    // Connection state
    isConnected,
    connectionState,

    // Game state
    essenceState,
    lastSyncTimestamp,

    // Actions
    sendTap,
    purchaseGenerator,
    purchaseUpgrade,
    requestSync,
    performPrestige,
    activateAbility,
    performGamble,
    performInfusion,

    // Connection control
    connect,
    disconnect,

    // Utility
    flushTapBatch,
    getPendingTapCount: () => pendingTapsRef.current.count,
    getQueuedActionCount: () => pendingActionsRef.current.length,
    getOptimisticEssence: () => optimisticEssenceRef.current,
    isReconnecting: () => isReconnectingRef.current,
  };
}

export default useEssenceTapSocket;
