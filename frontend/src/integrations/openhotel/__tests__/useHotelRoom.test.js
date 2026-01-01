/**
 * useHotelRoom Hook Tests
 *
 * Tests for room rendering utilities and tile calculations.
 */

import { describe, it, expect } from 'vitest';
import {
  getScreenPosition,
  getIsometricPosition,
  getZIndex
} from '../hooks/useHotelRoom';
import { TILE_CONSTANTS, ROOM_POINT } from '../config';

describe('Coordinate Conversion', () => {
  describe('getScreenPosition', () => {
    it('should convert isometric to screen coordinates', () => {
      // Origin
      const origin = getScreenPosition({ x: 0, y: 0, z: 0 });
      expect(origin).toEqual({ x: 0, y: 0 });

      // Moving in X direction (east)
      const east = getScreenPosition({ x: 1, y: 0, z: 0 });
      expect(east.x).toBeGreaterThan(0);
      expect(east.y).toBeGreaterThan(0);

      // Moving in Z direction (south)
      const south = getScreenPosition({ x: 0, y: 0, z: 1 });
      expect(south.x).toBeLessThan(0);
      expect(south.y).toBeGreaterThan(0);
    });

    it('should account for height (Y)', () => {
      const ground = getScreenPosition({ x: 1, y: 0, z: 1 });
      const elevated = getScreenPosition({ x: 1, y: 1, z: 1 });

      // Higher Y = lower screen Y (appears higher)
      expect(elevated.y).toBeLessThan(ground.y);
      expect(elevated.x).toBe(ground.x);
    });

    it('should use correct tile dimensions', () => {
      const { TILE_WIDTH, TILE_HEIGHT, TILE_Y_HEIGHT } = TILE_CONSTANTS;

      const pos = getScreenPosition({ x: 2, y: 0, z: 2 });

      // At x=2, z=2, the screen position should be:
      // x = (2 - 2) * (TILE_WIDTH / 2) = 0
      // y = (2 + 2) * (TILE_HEIGHT / 2) = 4 * 16 = 64
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(4 * (TILE_HEIGHT / 2));
    });
  });

  describe('getIsometricPosition', () => {
    it('should convert screen to isometric coordinates', () => {
      const iso = getIsometricPosition({ x: 0, y: 0 });
      expect(iso.x).toBe(0);
      expect(iso.z).toBe(0);
      expect(iso.y).toBe(0);
    });

    it('should round to nearest tile', () => {
      // Test that fractional positions get rounded
      const iso = getIsometricPosition({ x: 10, y: 10 });
      expect(Number.isInteger(iso.x)).toBe(true);
      expect(Number.isInteger(iso.z)).toBe(true);
    });

    it('should handle height parameter', () => {
      const ground = getIsometricPosition({ x: 32, y: 48 }, 0);
      const elevated = getIsometricPosition({ x: 32, y: 48 }, 1);

      expect(ground.y).toBe(0);
      expect(elevated.y).toBe(1);
    });

    it('should be inverse of getScreenPosition (approximately)', () => {
      const original = { x: 5, y: 0, z: 3 };
      const screen = getScreenPosition(original);
      const back = getIsometricPosition(screen, 0);

      expect(back.x).toBe(original.x);
      expect(back.z).toBe(original.z);
    });
  });

  describe('getZIndex', () => {
    it('should calculate z-index for rendering order', () => {
      const front = getZIndex({ x: 0, y: 0, z: 0 });
      const back = getZIndex({ x: 5, y: 0, z: 5 });

      // Tiles further from camera (higher x+z) should have higher z-index
      expect(back).toBeGreaterThan(front);
    });

    it('should apply offset', () => {
      const base = getZIndex({ x: 1, y: 0, z: 1 });
      const withOffset = getZIndex({ x: 1, y: 0, z: 1 }, 100);

      expect(withOffset).toBe(base + 100);
    });

    it('should be consistent for same position', () => {
      const pos = { x: 3, y: 0, z: 2 };
      expect(getZIndex(pos)).toBe(getZIndex(pos));
    });
  });
});

describe('Room Layout Utilities', () => {
  const testLayout = [
    ['x', 'x', 'x', 'x'],
    ['x', '1', '1', 'x'],
    ['x', '1', '1', 's'],
    ['x', 'x', 'x', 'x']
  ];

  // Import utilities that need layout
  const isWalkable = (layout, pos) => {
    if (!layout || !layout[pos.z]) return false;
    const tile = layout[pos.z][pos.x];
    if (!tile || tile === ROOM_POINT.EMPTY) return false;
    return true;
  };

  const getTileHeight = (layout, pos) => {
    if (!layout || !layout[pos.z]) return 0;
    const tile = layout[pos.z][pos.x];
    if (!tile || tile === ROOM_POINT.EMPTY) return 0;
    if (tile === ROOM_POINT.SPAWN) return 1;
    const height = parseInt(tile);
    return isNaN(height) ? 1 : height;
  };

  describe('isWalkable', () => {
    it('should return true for valid tiles', () => {
      expect(isWalkable(testLayout, { x: 1, z: 1 })).toBe(true);
      expect(isWalkable(testLayout, { x: 2, z: 2 })).toBe(true);
    });

    it('should return true for spawn tile', () => {
      expect(isWalkable(testLayout, { x: 3, z: 2 })).toBe(true);
    });

    it('should return false for empty tiles', () => {
      expect(isWalkable(testLayout, { x: 0, z: 0 })).toBe(false);
      expect(isWalkable(testLayout, { x: 0, z: 3 })).toBe(false);
    });

    it('should return false for out of bounds', () => {
      expect(isWalkable(testLayout, { x: 10, z: 10 })).toBe(false);
      expect(isWalkable(testLayout, { x: -1, z: 0 })).toBe(false);
    });

    it('should handle null layout', () => {
      expect(isWalkable(null, { x: 1, z: 1 })).toBe(false);
    });
  });

  describe('getTileHeight', () => {
    it('should return height for numbered tiles', () => {
      expect(getTileHeight(testLayout, { x: 1, z: 1 })).toBe(1);
    });

    it('should return 1 for spawn tiles', () => {
      expect(getTileHeight(testLayout, { x: 3, z: 2 })).toBe(1);
    });

    it('should return 0 for empty tiles', () => {
      expect(getTileHeight(testLayout, { x: 0, z: 0 })).toBe(0);
    });

    it('should handle multi-level layouts', () => {
      const multiLevel = [
        ['x', '1', '2', '3'],
        ['x', '1', '1', '1']
      ];

      expect(getTileHeight(multiLevel, { x: 1, z: 0 })).toBe(1);
      expect(getTileHeight(multiLevel, { x: 2, z: 0 })).toBe(2);
      expect(getTileHeight(multiLevel, { x: 3, z: 0 })).toBe(3);
    });
  });
});

describe('Room Bounds Calculation', () => {
  it('should calculate correct room dimensions', () => {
    const layout = [
      ['x', 'x', 'x', 'x', 'x'],
      ['x', '1', '1', '1', 'x'],
      ['x', '1', '1', '1', 'x'],
      ['x', 'x', 'x', 'x', 'x']
    ];

    const width = Math.max(...layout.map(row => row.length));
    const depth = layout.length;

    expect(width).toBe(5);
    expect(depth).toBe(4);
  });

  it('should handle irregular room shapes', () => {
    const irregular = [
      ['1', '1'],
      ['1', '1', '1'],
      ['1', '1', '1', '1']
    ];

    const width = Math.max(...irregular.map(row => row.length));
    expect(width).toBe(4);
  });
});

describe('Rendering Order', () => {
  it('should order tiles correctly for isometric rendering', () => {
    // Tiles should be rendered back-to-front
    const tiles = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 0, z: 1 },
      { x: 1, z: 1 }
    ];

    const sorted = tiles
      .map(t => ({ ...t, zIndex: getZIndex({ ...t, y: 0 }) }))
      .sort((a, b) => a.zIndex - b.zIndex);

    // Back tiles (lower x+z) should come first
    expect(sorted[0]).toMatchObject({ x: 0, z: 0 });
    expect(sorted[sorted.length - 1]).toMatchObject({ x: 1, z: 1 });
  });

  it('should handle avatars above tiles', () => {
    const tileZ = getZIndex({ x: 1, y: 0, z: 1 });
    const avatarZ = getZIndex({ x: 1, y: 0, z: 1 }, 0.5);

    // Avatar should render above tile at same position
    expect(avatarZ).toBeGreaterThan(tileZ);
  });
});
