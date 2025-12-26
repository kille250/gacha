/**
 * Fishing Multiplayer WebSocket Handler
 * Handles real-time player synchronization for the fishing minigame
 *
 * ============================================================================
 * EMOJI USAGE NOTICE
 * ============================================================================
 * This file contains INTENTIONAL emoji usage for the player emote system.
 * VALID_EMOTES is a whitelist of emojis players can send to each other.
 * These are displayed in the multiplayer fishing UI for player communication.
 *
 * These emojis are REQUIRED for game functionality and should NOT be removed.
 * They are validated server-side and sent to connected clients.
 * ============================================================================
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Configuration
const POSITION_BROADCAST_THROTTLE = 50; // ms between position broadcasts
const FISHING_AREA_ID = 'main_pond'; // Single fishing area for now
const MAX_PLAYERS_PER_AREA = 50;
const INACTIVE_TIMEOUT = 60000; // 1 minute before removing inactive player
const MAX_CONNECTIONS_PER_IP = 3; // Prevent connection flooding from single IP
const CHAT_COOLDOWN_MS = 500; // 2 messages per second max
const EMOTE_COOLDOWN_MS = 200; // 5 emotes per second max

// Constants for validation (defined once, not on every event)
const VALID_STATES = ['walking', 'casting', 'waiting', 'fish_appeared', 'catching', 'success', 'failure'];
const VALID_EMOTES = ['👋', '🎉', '😊', '🐟', '🎣', '👍', '💪', '🌟'];

// Store connected players by area
const areas = new Map();

// Track connections per IP for rate limiting
const connectionsByIP = new Map();

// Track chat/emote cooldowns per user
const chatCooldowns = new Map();
const emoteCooldowns = new Map();

// Get or create an area
function getArea(areaId) {
  if (!areas.has(areaId)) {
    areas.set(areaId, {
      id: areaId,
      players: new Map(),
      lastBroadcast: new Map()
    });
  }
  return areas.get(areaId);
}

// Generate a random color for player avatar
function generatePlayerColor() {
  const colors = [
    0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181,
    0xaa96da, 0xfcbad3, 0xa8d8ea, 0xffb6b9, 0x61c0bf,
    0xbbded6, 0xfae3d9, 0xffb347, 0x87ceeb, 0xdda0dd
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Verify JWT token
async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Token structure is { user: { id: ... } }
    const userId = decoded.user?.id || decoded.userId;
    if (!userId) return null;
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username']
    });
    return user;
  } catch (err) {
    console.error('[Fishing MP] Token verification error:', err.message);
    return null;
  }
}

// Initialize multiplayer socket handlers
function initMultiplayer(io) {
  // Create fishing namespace
  const fishingNamespace = io.of('/fishing');

  fishingNamespace.use(async (socket, next) => {
    try {
      // Check per-IP connection limit first
      const clientIP = socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || socket.handshake.address
        || 'unknown';
      const currentIPConnections = connectionsByIP.get(clientIP) || 0;

      if (currentIPConnections >= MAX_CONNECTIONS_PER_IP) {
        console.log(`[Fishing MP] Rejecting connection from ${clientIP}: too many connections (${currentIPConnections})`);
        return next(new Error('Too many connections from this IP'));
      }

      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const user = await verifyToken(token);
      if (!user) {
        return next(new Error('Invalid token'));
      }

      // Store IP on socket for cleanup later
      socket.clientIP = clientIP;
      socket.user = user;

      // Increment connection count for this IP
      connectionsByIP.set(clientIP, currentIPConnections + 1);

      next();
    } catch (_err) {
      next(new Error('Authentication failed'));
    }
  });

  fishingNamespace.on('connection', (socket) => {
    const userId = socket.user.id;
    const username = socket.user.username;
    const areaId = FISHING_AREA_ID;
    
    console.log(`[Fishing MP] Player "${username}" connected`);
    
    const area = getArea(areaId);
    
    // Check if user is already connected (duplicate tab/browser)
    // If so, disconnect the old connection first
    const existingPlayer = area.players.get(userId);
    if (existingPlayer && existingPlayer.socketId !== socket.id) {
      console.log(`[Fishing MP] Player "${username}" already connected, disconnecting old session`);
      const oldSocket = fishingNamespace.sockets.get(existingPlayer.socketId);
      if (oldSocket) {
        oldSocket.emit('duplicate_session', { message: 'You connected from another tab/browser' });
        oldSocket.disconnect(true);
      }
      // Remove from area (will be re-added below)
      area.players.delete(userId);
      area.lastBroadcast.delete(userId);
    }
    
    // Check if area is full (after removing duplicate)
    if (area.players.size >= MAX_PLAYERS_PER_AREA) {
      socket.emit('error', { message: 'Area is full, try again later' });
      socket.disconnect();
      return;
    }
    
    // Create player data
    const playerData = {
      id: userId,
      username: username,
      color: generatePlayerColor(),
      x: 10, // Default spawn position
      y: 6,
      direction: 'down',
      state: 'walking', // walking, casting, waiting, fish_appeared, catching, success, failure
      lastFish: null,
      lastUpdate: Date.now(),
      socketId: socket.id
    };
    
    // Join the area room
    socket.join(areaId);
    
    // Add player to area
    area.players.set(userId, playerData);
    
    // Send current players to the new player
    const otherPlayers = [];
    area.players.forEach((player, id) => {
      if (id !== userId) {
        otherPlayers.push({
          id: player.id,
          username: player.username,
          color: player.color,
          x: player.x,
          y: player.y,
          direction: player.direction,
          state: player.state
        });
      }
    });
    
    socket.emit('init', {
      playerId: userId,
      players: otherPlayers,
      areaId: areaId
    });
    
    // Broadcast new player to others
    socket.to(areaId).emit('player_joined', {
      id: playerData.id,
      username: playerData.username,
      color: playerData.color,
      x: playerData.x,
      y: playerData.y,
      direction: playerData.direction,
      state: playerData.state
    });
    
    // Handle position updates
    socket.on('move', (data) => {
      const player = area.players.get(userId);
      if (!player) return;
      
      // Throttle broadcasts
      const now = Date.now();
      const lastBroadcast = area.lastBroadcast.get(userId) || 0;
      
      // Update local data
      player.x = Math.max(0, Math.min(23, data.x));
      player.y = Math.max(0, Math.min(13, data.y));
      player.direction = data.direction || player.direction;
      player.lastUpdate = now;
      
      // Only broadcast if enough time has passed
      if (now - lastBroadcast >= POSITION_BROADCAST_THROTTLE) {
        area.lastBroadcast.set(userId, now);
        socket.to(areaId).emit('player_moved', {
          id: userId,
          x: player.x,
          y: player.y,
          direction: player.direction
        });
      }
    });
    
    // Handle state changes (fishing state)
    socket.on('state_change', (data) => {
      const player = area.players.get(userId);
      if (!player || !VALID_STATES.includes(data.state)) return;
      
      player.state = data.state;
      player.lastUpdate = Date.now();
      
      // Include fish info for success/failure states
      const eventData = {
        id: userId,
        state: player.state
      };
      
      if (data.fish) {
        eventData.fish = {
          name: data.fish.name,
          emoji: data.fish.emoji,
          rarity: data.fish.rarity
        };
        player.lastFish = eventData.fish;
      }
      
      if (data.success !== undefined) {
        eventData.success = data.success;
      }
      
      socket.to(areaId).emit('player_state', eventData);
    });
    
    // Handle chat messages with rate limiting
    socket.on('chat', (data) => {
      if (!data.message || typeof data.message !== 'string') return;

      // Check chat cooldown
      const lastChat = chatCooldowns.get(userId) || 0;
      const now = Date.now();
      if (now - lastChat < CHAT_COOLDOWN_MS) {
        return; // Silently drop spammed messages
      }
      chatCooldowns.set(userId, now);

      // Sanitize and limit message length
      const message = data.message.trim().slice(0, 100);
      if (!message) return;

      socket.to(areaId).emit('chat', {
        id: userId,
        username: username,
        message: message
      });
    });

    // Handle reactions/emotes with rate limiting
    socket.on('emote', (data) => {
      if (!data.emote || !VALID_EMOTES.includes(data.emote)) return;

      // Check emote cooldown
      const lastEmote = emoteCooldowns.get(userId) || 0;
      const now = Date.now();
      if (now - lastEmote < EMOTE_COOLDOWN_MS) {
        return; // Silently drop spammed emotes
      }
      emoteCooldowns.set(userId, now);

      socket.to(areaId).emit('player_emote', { id: userId, emote: data.emote });
    });
    
    // Handle heartbeat/keep-alive (for autofishing users who don't move)
    socket.on('heartbeat', () => {
      const player = area.players.get(userId);
      if (player) {
        player.lastUpdate = Date.now();
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[Fishing MP] Player "${username}" disconnected`);

      // Decrement IP connection count
      if (socket.clientIP) {
        const currentCount = connectionsByIP.get(socket.clientIP) || 1;
        if (currentCount <= 1) {
          connectionsByIP.delete(socket.clientIP);
        } else {
          connectionsByIP.set(socket.clientIP, currentCount - 1);
        }
      }

      // Clean up user cooldowns
      chatCooldowns.delete(userId);
      emoteCooldowns.delete(userId);

      const area = areas.get(areaId);
      if (area) {
        // Only broadcast player_left if this socket is still the active one for this user
        // This prevents duplicate broadcasts when a user opens a new tab (duplicate session)
        const currentPlayer = area.players.get(userId);
        if (currentPlayer && currentPlayer.socketId === socket.id) {
          area.players.delete(userId);
          area.lastBroadcast.delete(userId);

          // Notify others
          socket.to(areaId).emit('player_left', {
            id: userId
          });
        }

        // Clean up empty areas
        if (area.players.size === 0) {
          areas.delete(areaId);
        }
      }
    });
  });
  
  // Periodic cleanup of inactive players
  setInterval(() => {
    const now = Date.now();
    areas.forEach((area, areaId) => {
      area.players.forEach((player, playerId) => {
        if (now - player.lastUpdate > INACTIVE_TIMEOUT) {
          const socket = fishingNamespace.sockets.get(player.socketId);
          if (socket) {
            socket.disconnect();
          }
          area.players.delete(playerId);
          fishingNamespace.to(areaId).emit('player_left', { id: playerId });
        }
      });
    });
  }, 30000);
  
  return fishingNamespace;
}

module.exports = {
  initMultiplayer
};