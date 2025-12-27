/**
 * Fate Points Event Bus
 *
 * Simple event emitter for coordinating Fate Points state updates across components.
 * Used to notify FatePointsDisplay when FP are earned from rolls, so it can update
 * immediately without waiting for visibility-based cache refresh.
 *
 * USAGE:
 * - Emit: fatePointsEvents.emit(FP_EVENTS.EARNED, { points, pointsThisWeek, weeklyMax })
 * - Subscribe: fatePointsEvents.on(FP_EVENTS.EARNED, callback)
 */

// Event types for type safety
export const FP_EVENTS = {
  /** Emitted when FP are earned from a roll */
  EARNED: 'fp:earned',
  /** Emitted when FP are spent (exchange) */
  SPENT: 'fp:spent',
  /** Emitted when weekly cap resets */
  WEEKLY_RESET: 'fp:weekly_reset'
};

// Simple event emitter
class FatePointsEventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name from FP_EVENTS
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
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
   * Emit an event with data
   * @param {string} event - Event name from FP_EVENTS
   * @param {Object} data - Event payload (fatePoints status object)
   */
  emit(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`[FatePointsEvents] Error in ${event} listener:`, err);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event (or all events if no event specified)
   * @param {string} [event] - Optional event name
   */
  off(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Singleton instance
const fatePointsEvents = new FatePointsEventEmitter();

export default fatePointsEvents;
