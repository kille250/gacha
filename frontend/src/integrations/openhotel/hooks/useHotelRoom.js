/**
 * useHotelRoom Hook
 *
 * Provides room-specific functionality including rendering utilities,
 * tile interactions, and room management.
 */

import { useState, useCallback, useMemo } from 'react';
import { useOpenHotel } from '../OpenHotelProvider';
import { TILE_CONSTANTS, ROOM_POINT, DIRECTION } from '../config';

/**
 * Convert isometric position to screen coordinates
 * @param {object} position - {x, y, z} isometric position
 * @returns {object} {x, y} screen position
 */
export function getScreenPosition(position) {
  const { TILE_WIDTH, TILE_HEIGHT, TILE_Y_HEIGHT } = TILE_CONSTANTS;

  const screenX = (position.x - position.z) * (TILE_WIDTH / 2);
  const screenY = (position.x + position.z) * (TILE_HEIGHT / 2) - (position.y * TILE_Y_HEIGHT);

  return { x: screenX, y: screenY };
}

/**
 * Convert screen coordinates to isometric position
 * @param {object} screenPos - {x, y} screen position
 * @param {number} height - Y height level (default 0)
 * @returns {object} {x, z} isometric position
 */
export function getIsometricPosition(screenPos, height = 0) {
  const { TILE_WIDTH, TILE_HEIGHT, TILE_Y_HEIGHT } = TILE_CONSTANTS;

  // Adjust for height
  const adjustedY = screenPos.y + (height * TILE_Y_HEIGHT);

  const x = (screenPos.x / (TILE_WIDTH / 2) + adjustedY / (TILE_HEIGHT / 2)) / 2;
  const z = (adjustedY / (TILE_HEIGHT / 2) - screenPos.x / (TILE_WIDTH / 2)) / 2;

  return {
    x: Math.round(x),
    y: height,
    z: Math.round(z)
  };
}

/**
 * Calculate z-index for proper rendering order
 * @param {object} position - {x, y, z} position
 * @param {number} offset - Additional offset
 * @returns {number} Z-index value
 */
export function getZIndex(position, offset = 0) {
  const { SAFE_ZINDEX_MULTI } = TILE_CONSTANTS;
  return (position.x + position.z) * SAFE_ZINDEX_MULTI + offset;
}

/**
 * Check if a point is walkable in the layout
 * @param {array} layout - Room layout array
 * @param {object} position - {x, z} position to check
 * @returns {boolean} Whether the tile is walkable
 */
export function isWalkable(layout, position) {
  if (!layout || !layout[position.z]) return false;

  const tile = layout[position.z][position.x];
  if (!tile || tile === ROOM_POINT.EMPTY) return false;

  return true;
}

/**
 * Get tile height from layout
 * @param {array} layout - Room layout array
 * @param {object} position - {x, z} position
 * @returns {number} Tile height
 */
export function getTileHeight(layout, position) {
  if (!layout || !layout[position.z]) return 0;

  const tile = layout[position.z][position.x];
  if (!tile || tile === ROOM_POINT.EMPTY) return 0;
  if (tile === ROOM_POINT.SPAWN) return 1;

  const height = parseInt(tile);
  return isNaN(height) ? 1 : height;
}

/**
 * Room Hook
 */
export function useHotelRoom() {
  const {
    currentRoom,
    roomUsers,
    roomFurniture,
    joinRoom,
    leaveRoom,
    moveToTile,
    placeFurniture,
    pickupFurniture,
    hotelAccount
  } = useOpenHotel();

  // Hover state for tile highlighting
  const [hoveredTile, setHoveredTile] = useState(null);
  const [selectedFurniture, setSelectedFurniture] = useState(null);

  /**
   * Get current user's avatar
   */
  const myAvatar = useMemo(() => {
    if (!hotelAccount || !roomUsers) return null;
    return roomUsers.find(u => u.accountId === hotelAccount.accountId);
  }, [hotelAccount, roomUsers]);

  /**
   * Get room dimensions
   */
  const roomDimensions = useMemo(() => {
    if (!currentRoom?.layout) return { width: 0, depth: 0 };

    return {
      width: Math.max(...currentRoom.layout.map(row => row.length)),
      depth: currentRoom.layout.length
    };
  }, [currentRoom]);

  /**
   * Get room boundaries in screen coordinates
   */
  const roomBounds = useMemo(() => {
    const { width, depth } = roomDimensions;
    if (!width || !depth) return null;

    const corners = [
      getScreenPosition({ x: 0, y: 0, z: 0 }),
      getScreenPosition({ x: width - 1, y: 0, z: 0 }),
      getScreenPosition({ x: 0, y: 0, z: depth - 1 }),
      getScreenPosition({ x: width - 1, y: 0, z: depth - 1 })
    ];

    return {
      minX: Math.min(...corners.map(c => c.x)) - TILE_CONSTANTS.WALL_WIDTH,
      maxX: Math.max(...corners.map(c => c.x)) + TILE_CONSTANTS.TILE_WIDTH / 2,
      minY: Math.min(...corners.map(c => c.y)) - TILE_CONSTANTS.WALL_HEIGHT,
      maxY: Math.max(...corners.map(c => c.y)) + TILE_CONSTANTS.TILE_HEIGHT / 2
    };
  }, [roomDimensions]);

  /**
   * Handle tile click - move avatar
   */
  const handleTileClick = useCallback((position) => {
    if (!currentRoom) return;

    const layout = currentRoom.layout;
    if (!isWalkable(layout, position)) return;

    // Get actual height at target
    const height = getTileHeight(layout, position);
    moveToTile({ ...position, y: height });
  }, [currentRoom, moveToTile]);

  /**
   * Handle tile hover
   */
  const handleTileHover = useCallback((position) => {
    setHoveredTile(position);
  }, []);

  /**
   * Handle tile leave
   */
  const handleTileLeave = useCallback(() => {
    setHoveredTile(null);
  }, []);

  /**
   * Handle furniture click
   */
  const handleFurnitureClick = useCallback((furniture) => {
    setSelectedFurniture(prev =>
      prev?.id === furniture.id ? null : furniture
    );
  }, []);

  /**
   * Get furniture at position
   */
  const getFurnitureAt = useCallback((position) => {
    if (!roomFurniture) return [];

    return roomFurniture.filter(f =>
      f.position.x === position.x &&
      f.position.z === position.z
    );
  }, [roomFurniture]);

  /**
   * Get users at position
   */
  const getUsersAt = useCallback((position) => {
    if (!roomUsers) return [];

    return roomUsers.filter(u =>
      u.position.x === position.x &&
      u.position.z === position.z
    );
  }, [roomUsers]);

  /**
   * Check if position is occupied
   */
  const isPositionOccupied = useCallback((position) => {
    const furniture = getFurnitureAt(position);
    const users = getUsersAt(position);

    // Check if any furniture blocks movement
    const blockingFurniture = furniture.some(f => f.blocking !== false);

    return blockingFurniture || users.length > 0;
  }, [getFurnitureAt, getUsersAt]);

  /**
   * Generate tiles data for rendering
   */
  const tilesData = useMemo(() => {
    if (!currentRoom?.layout) return [];

    const tiles = [];
    const layout = currentRoom.layout;

    for (let z = 0; z < layout.length; z++) {
      for (let x = 0; x < layout[z].length; x++) {
        const tile = layout[z][x];
        if (!tile || tile === ROOM_POINT.EMPTY) continue;

        const isSpawn = tile === ROOM_POINT.SPAWN;
        const height = isSpawn ? 1 : (parseInt(tile) || 1);
        const position = { x, y: height - 1, z };

        tiles.push({
          position,
          height,
          isSpawn,
          screenPosition: getScreenPosition(position),
          zIndex: getZIndex(position),
          isHovered: hoveredTile?.x === x && hoveredTile?.z === z,
          isOccupied: isPositionOccupied(position)
        });
      }
    }

    return tiles;
  }, [currentRoom, hoveredTile, isPositionOccupied]);

  return {
    // Room data
    room: currentRoom,
    layout: currentRoom?.layout,
    dimensions: roomDimensions,
    bounds: roomBounds,

    // Entities
    users: roomUsers,
    furniture: roomFurniture,
    myAvatar,

    // Tiles
    tiles: tilesData,
    hoveredTile,
    selectedFurniture,

    // Actions
    joinRoom,
    leaveRoom,
    moveToTile: handleTileClick,
    placeFurniture,
    pickupFurniture,

    // Event handlers
    handleTileClick,
    handleTileHover,
    handleTileLeave,
    handleFurnitureClick,

    // Utilities
    getScreenPosition,
    getIsometricPosition,
    getZIndex,
    isWalkable: (pos) => isWalkable(currentRoom?.layout, pos),
    getTileHeight: (pos) => getTileHeight(currentRoom?.layout, pos),
    getFurnitureAt,
    getUsersAt,
    isPositionOccupied
  };
}

export default useHotelRoom;
