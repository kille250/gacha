/**
 * OpenHotel Integration Configuration
 *
 * Manages connection settings for the OpenHotel server integration.
 * All values can be overridden via environment variables.
 *
 * RENDER.COM DEPLOYMENT:
 * Set these environment variables in your Render dashboard:
 *   - VITE_OPENHOTEL_ENABLED: "true"
 *   - VITE_OPENHOTEL_URL: "wss://your-hotel-service.onrender.com"
 *   - VITE_OPENHOTEL_HTTP_URL: "https://your-hotel-service.onrender.com"
 */

// Detect if we're in production (Render.com)
const isProduction = import.meta.env.PROD;

// Build WebSocket URL from HTTP URL if not explicitly set
const buildWsUrl = (httpUrl) => {
  if (!httpUrl) return null;
  try {
    const url = new URL(httpUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
};

// Get the OpenHotel URLs with proper protocol handling
const getServerUrl = () => {
  // Explicit WebSocket URL takes priority
  if (import.meta.env.VITE_OPENHOTEL_URL) {
    return import.meta.env.VITE_OPENHOTEL_URL;
  }
  // Try to derive from HTTP URL
  if (import.meta.env.VITE_OPENHOTEL_HTTP_URL) {
    return buildWsUrl(import.meta.env.VITE_OPENHOTEL_HTTP_URL);
  }
  // Development default
  return 'ws://localhost:3005';
};

const getHttpUrl = () => {
  if (import.meta.env.VITE_OPENHOTEL_HTTP_URL) {
    return import.meta.env.VITE_OPENHOTEL_HTTP_URL;
  }
  return 'http://localhost:3005';
};

export const OPENHOTEL_CONFIG = {
  // Server connection
  serverUrl: getServerUrl(),
  httpUrl: getHttpUrl(),

  // Connection settings - more resilient for production
  reconnectInterval: isProduction ? 5000 : 3000,
  reconnectMaxAttempts: isProduction ? 10 : 5,
  heartbeatInterval: 30000,
  connectionTimeout: isProduction ? 15000 : 10000,

  // Feature flags
  enabled: import.meta.env.VITE_OPENHOTEL_ENABLED === 'true',
  debugMode: import.meta.env.DEV && !isProduction,

  // Production flags
  isProduction,

  // Currency exchange rates (your points ↔ hotel credits)
  currencyExchange: {
    fatePointsToCredits: 10, // 10 fate points = 1 hotel credit
    creditsToFatePoints: 10  // 1 hotel credit = 10 fate points
  },

  // Default room settings
  defaultRoom: {
    layout: [
      ['x', 'x', 'x', 'x', 'x', 'x'],
      ['x', '1', '1', '1', '1', 'x'],
      ['x', '1', '1', '1', '1', 'x'],
      ['x', '1', '1', '1', '1', 's'],
      ['x', '1', '1', '1', '1', 'x'],
      ['x', 'x', 'x', 'x', 'x', 'x']
    ],
    maxUsers: 25
  }
};

// Tile rendering constants (from OpenHotel)
export const TILE_CONSTANTS = {
  TILE_WIDTH: 64,
  TILE_HEIGHT: 32,
  TILE_Y_HEIGHT: 32,
  WALL_HEIGHT: 116,
  WALL_WIDTH: 8,
  WALL_DOOR_HEIGHT: 84,
  MOVEMENT_DURATION: 500, // ms per tile
  SAFE_ZINDEX_MULTI: 1000
};

// Room point types
export const ROOM_POINT = {
  EMPTY: 'x',
  SPAWN: 's',
  TILE: '1', // Height 1
  // Heights 2-9 are numeric strings
};

// Direction enums (8-way movement)
export const DIRECTION = {
  NORTH: 0,
  NORTH_EAST: 1,
  EAST: 2,
  SOUTH_EAST: 3,
  SOUTH: 4,
  SOUTH_WEST: 5,
  WEST: 6,
  NORTH_WEST: 7,
  NONE: -1
};

// WebSocket event types (OpenHotel protocol)
export const OH_EVENT = {
  // Connection
  WELCOME: 'welcome',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',

  // Room lifecycle
  PRE_JOIN_ROOM: 'pre-join-room',
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  DELETE_ROOM: 'delete-room',
  LOAD_ROOM: 'load-room',
  REMOVE_ROOM: 'remove-room',

  // Human/Avatar actions
  ADD_HUMAN: 'add-human',
  REMOVE_HUMAN: 'remove-human',
  MOVE_HUMAN: 'move-human',
  SET_POSITION_HUMAN: 'set-position-human',

  // Furniture
  ADD_FURNITURE: 'add-furniture',
  UPDATE_FURNITURE: 'update-furniture',
  REMOVE_FURNITURE: 'remove-furniture',
  INTERACT_FURNITURE: 'interact-furniture',
  PLACE_ITEM: 'place-item',
  ROTATE_FURNITURE: 'rotate-furniture',
  PICK_UP_FURNITURE: 'pick-up-furniture',
  MOVE_FURNITURE: 'move-furniture',

  // Interaction
  POINTER_TILE: 'pointer-tile',
  POINTER_INTERACTIVE: 'pointer-interactive',

  // Chat
  MESSAGE: 'message',
  WHISPER_MESSAGE: 'whisper-message',
  TYPING_START: 'typing-start',
  TYPING_END: 'typing-end',
  SYSTEM_MESSAGE: 'system-message',

  // Navigation
  REDIRECT: 'redirect'
};

export default OPENHOTEL_CONFIG;
