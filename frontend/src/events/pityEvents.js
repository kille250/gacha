/**
 * Pity State Event Bus
 *
 * Simple event emitter for coordinating pity counter updates across components.
 * Used to notify PityDisplay when counters change from rolls, so it can update
 * immediately without waiting for visibility-based cache refresh.
 *
 * USAGE:
 * - Emit: pityEvents.emit(PITY_EVENTS.UPDATED, pityStateData)
 * - Subscribe: pityEvents.on(PITY_EVENTS.UPDATED, callback)
 */

// Event types for type safety
export const PITY_EVENTS = {
  /** Emitted when pity counters are updated from a roll */
  UPDATED: 'pity:updated'
};

// Simple event emitter
class PityEventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name from PITY_EVENTS
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
   * @param {string} event - Event name from PITY_EVENTS
   * @param {Object} data - Event payload (pityState object)
   */
  emit(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`[PityEvents] Error in ${event} listener:`, err);
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
const pityEvents = new PityEventEmitter();

export default pityEvents;
