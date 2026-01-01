/**
 * Currency Adapter for OpenHotel
 *
 * Manages the bidirectional exchange between your game's currencies
 * (points, fate points, tickets) and OpenHotel's credits system.
 */

import api from '../../../utils/api';
import { OPENHOTEL_CONFIG } from '../config';

/**
 * Currency types in your system
 */
export const CURRENCY_TYPE = {
  POINTS: 'points',           // Main currency
  FATE_POINTS: 'fatePoints',  // Banner-specific currency
  ROLL_TICKETS: 'rollTickets',
  PREMIUM_TICKETS: 'premiumTickets',
  HOTEL_CREDITS: 'hotelCredits' // OpenHotel virtual currency
};

/**
 * Currency exchange rates
 * Customize these based on your game's economy
 */
const EXCHANGE_RATES = {
  // Points to Hotel Credits
  [CURRENCY_TYPE.POINTS]: {
    toCredits: 100,   // 100 points = 1 credit
    fromCredits: 100  // 1 credit = 100 points
  },
  // Fate Points to Hotel Credits (premium rate)
  [CURRENCY_TYPE.FATE_POINTS]: {
    toCredits: 5,     // 5 fate points = 1 credit
    fromCredits: 5
  }
};

/**
 * CurrencyAdapter - Manages currency exchange between systems
 */
export class CurrencyAdapter {
  constructor() {
    this.cachedBalance = null;
    this.lastSync = null;
    this.pendingTransactions = [];
  }

  /**
   * Get user's current currency balances
   * @returns {object} Currency balances
   */
  async getBalances() {
    try {
      const response = await api.get('/auth/me');
      const user = response.data;

      this.cachedBalance = {
        points: user.points || 0,
        fatePoints: this.sumFatePoints(user.fatePoints),
        rollTickets: user.rollTickets || 0,
        premiumTickets: user.premiumTickets || 0,
        // Calculate equivalent hotel credits
        hotelCredits: this.calculateHotelCredits(user)
      };

      this.lastSync = Date.now();
      return this.cachedBalance;
    } catch (error) {
      console.error('Failed to get currency balances:', error);
      throw error;
    }
  }

  /**
   * Sum fate points across all banners
   * @param {object} fatePoints - Banner fate points object
   * @returns {number} Total fate points
   */
  sumFatePoints(fatePoints) {
    if (!fatePoints || typeof fatePoints !== 'object') {
      return 0;
    }
    return Object.values(fatePoints).reduce((sum, fp) => {
      return sum + (fp?.points || 0);
    }, 0);
  }

  /**
   * Calculate hotel credits from your currencies
   * @param {object} user - User data
   * @returns {number} Equivalent hotel credits
   */
  calculateHotelCredits(user) {
    const pointCredits = Math.floor(
      (user.points || 0) / EXCHANGE_RATES[CURRENCY_TYPE.POINTS].toCredits
    );
    const fateCredits = Math.floor(
      this.sumFatePoints(user.fatePoints) / EXCHANGE_RATES[CURRENCY_TYPE.FATE_POINTS].toCredits
    );

    return pointCredits + fateCredits;
  }

  /**
   * Convert your currency to hotel credits
   * @param {string} currencyType - Source currency type
   * @param {number} amount - Amount to convert
   * @returns {number} Hotel credits received
   */
  convertToCredits(currencyType, amount) {
    const rate = EXCHANGE_RATES[currencyType];
    if (!rate) {
      throw new Error(`Unknown currency type: ${currencyType}`);
    }
    return Math.floor(amount / rate.toCredits);
  }

  /**
   * Convert hotel credits to your currency
   * @param {string} currencyType - Target currency type
   * @param {number} credits - Credits to convert
   * @returns {number} Your currency received
   */
  convertFromCredits(currencyType, credits) {
    const rate = EXCHANGE_RATES[currencyType];
    if (!rate) {
      throw new Error(`Unknown currency type: ${currencyType}`);
    }
    return credits * rate.fromCredits;
  }

  /**
   * Check if user can afford a purchase in hotel credits
   * @param {number} creditCost - Cost in hotel credits
   * @returns {boolean} Whether user can afford it
   */
  async canAfford(creditCost) {
    const balances = await this.getBalances();
    return balances.hotelCredits >= creditCost;
  }

  /**
   * Process a hotel purchase by deducting from your currencies
   * Prefers fate points, then falls back to regular points
   *
   * @param {number} creditCost - Cost in hotel credits
   * @returns {object} Transaction result
   */
  async processPurchase(creditCost) {
    const balances = await this.getBalances();

    if (balances.hotelCredits < creditCost) {
      throw new Error('Insufficient credits');
    }

    // Calculate how much to deduct from each currency
    let remainingCost = creditCost;
    const deductions = {
      fatePoints: 0,
      points: 0
    };

    // First, try fate points (premium currency)
    const fateCreditsAvailable = this.convertToCredits(
      CURRENCY_TYPE.FATE_POINTS,
      balances.fatePoints
    );
    if (fateCreditsAvailable > 0) {
      const fateCreditsToUse = Math.min(fateCreditsAvailable, remainingCost);
      deductions.fatePoints = this.convertFromCredits(
        CURRENCY_TYPE.FATE_POINTS,
        fateCreditsToUse
      );
      remainingCost -= fateCreditsToUse;
    }

    // Then, use regular points
    if (remainingCost > 0) {
      deductions.points = this.convertFromCredits(
        CURRENCY_TYPE.POINTS,
        remainingCost
      );
    }

    // Record transaction
    const transaction = {
      id: Date.now().toString(36),
      type: 'hotel_purchase',
      creditCost,
      deductions,
      timestamp: new Date().toISOString()
    };

    this.pendingTransactions.push(transaction);

    // Note: Actual deduction would be done via your backend API
    // This is a placeholder that returns the calculated deductions
    return {
      success: true,
      transaction,
      message: `Purchase of ${creditCost} credits processed`,
      deductions
    };
  }

  /**
   * Commit pending transactions to your backend
   * Call this after successful hotel transaction
   */
  async commitTransactions() {
    if (this.pendingTransactions.length === 0) {
      return { success: true, committed: 0 };
    }

    try {
      // TODO: Implement backend endpoint for currency deductions
      // const response = await api.post('/hotel/transactions', {
      //   transactions: this.pendingTransactions
      // });

      const committed = this.pendingTransactions.length;
      this.pendingTransactions = [];
      this.cachedBalance = null; // Force refresh

      return { success: true, committed };
    } catch (error) {
      console.error('Failed to commit transactions:', error);
      throw error;
    }
  }

  /**
   * Rollback pending transactions (e.g., if hotel purchase failed)
   */
  rollbackTransactions() {
    this.pendingTransactions = [];
  }

  /**
   * Get transaction history for hotel purchases
   * @returns {array} Recent transactions
   */
  async getTransactionHistory() {
    try {
      const response = await api.get('/auth/me');
      const user = response.data;

      // Map fate points history to include hotel transactions
      const fateHistory = user.fatePointsHistory || [];

      return fateHistory.filter(tx =>
        tx.source === 'hotel_purchase' || tx.type === 'hotel'
      );
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }

  /**
   * Map furniture unlock from gacha to hotel inventory
   * When a user pulls a character that unlocks furniture
   *
   * @param {object} pullResult - Gacha pull result
   * @returns {object|null} Furniture unlock data
   */
  mapGachaToFurniture(pullResult) {
    // Check if the pulled character unlocks furniture
    const character = pullResult.character;
    if (!character) return null;

    // Map rarity to furniture tier
    const rarityToTier = {
      'common': 'basic',
      'rare': 'uncommon',
      'epic': 'rare',
      'legendary': 'legendary',
      'mythic': 'mythic'
    };

    const tier = rarityToTier[character.rarity?.name?.toLowerCase()] || 'basic';

    // Generate furniture data based on character
    return {
      furnitureId: `char_${character.id}_poster`,
      type: 'wall_decoration',
      tier,
      name: `${character.name} Poster`,
      description: `A poster featuring ${character.name}`,
      sourceCharacterId: character.id,
      unlockDate: new Date().toISOString()
    };
  }

  /**
   * Clear cached data
   */
  clearCache() {
    this.cachedBalance = null;
    this.lastSync = null;
  }
}

// Singleton instance
let instance = null;

export function getCurrencyAdapter() {
  if (!instance) {
    instance = new CurrencyAdapter();
  }
  return instance;
}

export function resetCurrencyAdapter() {
  if (instance) {
    instance.clearCache();
    instance.rollbackTransactions();
    instance = null;
  }
}

export default CurrencyAdapter;
