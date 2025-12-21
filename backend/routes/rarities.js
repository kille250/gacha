/**
 * Rarity Routes
 * 
 * API endpoints for managing rarity tiers (drop rates, colors, animation settings)
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { Rarity } = require('../models');
const { isValidId } = require('../utils/validation');
const { invalidateRaritiesCache } = require('../config/pricing');

// ===========================================
// PUBLIC ROUTES (for frontend display)
// ===========================================

/**
 * GET /api/rarities
 * Get all rarities (for frontend to use for display)
 * Returns rarities ordered by their order field
 */
router.get('/', async (req, res) => {
  try {
    const rarities = await Rarity.findAll({
      order: [['order', 'ASC']]
    });
    res.json(rarities);
  } catch (err) {
    console.error('Error fetching rarities:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/rarities/config
 * Get rarities formatted as configuration object for frontend
 * Used by SummonAnimation, DesignSystem, etc.
 */
router.get('/config', async (req, res) => {
  try {
    const rarities = await Rarity.findAll({
      order: [['order', 'ASC']]
    });
    
    // Format as configuration objects
    const config = {
      // For DesignSystem.js rarity colors
      colors: {},
      // For SummonAnimation.js rarity config
      animation: {},
      // Ordered list for dropdowns, etc.
      ordered: [],
      // Drop rates for display
      dropRates: {
        standard: { single: {}, multi: {} },
        banner: { single: {}, multi: {} },
        premium: { single: {}, multi: {} },
        pity: {}
      }
    };
    
    rarities.forEach(rarity => {
      const name = rarity.name;
      
      // Colors config
      config.colors[name] = rarity.color;
      
      // Animation config
      config.animation[name] = {
        color: rarity.color,
        accentColor: rarity.accentColor || rarity.color,
        glowIntensity: rarity.glowIntensity,
        buildupTime: rarity.buildupTime,
        confettiCount: rarity.confettiCount,
        orbCount: rarity.orbCount,
        ringCount: rarity.ringCount
      };
      
      // Ordered list
      config.ordered.push({
        name: rarity.name,
        displayName: rarity.displayName,
        color: rarity.color,
        order: rarity.order,
        isPityEligible: rarity.isPityEligible
      });
      
      // Drop rates
      config.dropRates.standard.single[name] = rarity.dropRateStandardSingle;
      config.dropRates.standard.multi[name] = rarity.dropRateStandardMulti;
      config.dropRates.banner.single[name] = rarity.dropRateBannerSingle;
      config.dropRates.banner.multi[name] = rarity.dropRateBannerMulti;
      config.dropRates.premium.single[name] = rarity.dropRatePremiumSingle;
      config.dropRates.premium.multi[name] = rarity.dropRatePremiumMulti;
      config.dropRates.pity[name] = rarity.dropRatePity;
    });
    
    res.json(config);
  } catch (err) {
    console.error('Error fetching rarity config:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/rarities/:id
 * Get a specific rarity by ID
 */
router.get('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid rarity ID' });
    }
    
    const rarity = await Rarity.findByPk(req.params.id);
    if (!rarity) {
      return res.status(404).json({ error: 'Rarity not found' });
    }
    
    res.json(rarity);
  } catch (err) {
    console.error('Error fetching rarity:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===========================================
// ADMIN ROUTES
// ===========================================

/**
 * POST /api/rarities
 * Create a new rarity (admin only)
 */
router.post('/', [auth, adminAuth], async (req, res) => {
  try {
    const {
      name,
      displayName,
      order,
      dropRateStandardSingle,
      dropRateStandardMulti,
      dropRateBannerSingle,
      dropRateBannerMulti,
      dropRatePremiumSingle,
      dropRatePremiumMulti,
      dropRatePity,
      capSingle,
      capMulti,
      multiplierScaling,
      minimumRate,
      color,
      accentColor,
      glowIntensity,
      buildupTime,
      confettiCount,
      orbCount,
      ringCount,
      isPityEligible
    } = req.body;
    
    // Validate required fields
    if (!name || !displayName) {
      return res.status(400).json({ error: 'Name and displayName are required' });
    }
    
    // Check for duplicate name
    const existing = await Rarity.findOne({ where: { name: name.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'A rarity with this name already exists' });
    }
    
    const rarity = await Rarity.create({
      name: name.toLowerCase(),
      displayName,
      order: order || 0,
      dropRateStandardSingle: dropRateStandardSingle || 0,
      dropRateStandardMulti: dropRateStandardMulti || 0,
      dropRateBannerSingle: dropRateBannerSingle || 0,
      dropRateBannerMulti: dropRateBannerMulti || 0,
      dropRatePremiumSingle: dropRatePremiumSingle || 0,
      dropRatePremiumMulti: dropRatePremiumMulti || 0,
      dropRatePity: dropRatePity || 0,
      capSingle: capSingle || null,
      capMulti: capMulti || null,
      multiplierScaling: multiplierScaling || 1.0,
      minimumRate: minimumRate || 0,
      color: color || '#8e8e93',
      accentColor: accentColor || null,
      glowIntensity: glowIntensity || 0.5,
      buildupTime: buildupTime || 1000,
      confettiCount: confettiCount || 0,
      orbCount: orbCount || 3,
      ringCount: ringCount || 1,
      isPityEligible: isPityEligible || false,
      isDefault: false
    });
    
    // Invalidate cache so new rarity is picked up immediately
    invalidateRaritiesCache();
    
    console.log(`Admin (ID: ${req.user.id}) created rarity: ${rarity.name}`);
    res.status(201).json(rarity);
  } catch (err) {
    console.error('Error creating rarity:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

/**
 * PUT /api/rarities/:id
 * Update a rarity (admin only)
 */
router.put('/:id', [auth, adminAuth], async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid rarity ID' });
    }
    
    const rarity = await Rarity.findByPk(req.params.id);
    if (!rarity) {
      return res.status(404).json({ error: 'Rarity not found' });
    }
    
    // Fields that can be updated
    const updateableFields = [
      'displayName', 'order',
      'dropRateStandardSingle', 'dropRateStandardMulti',
      'dropRateBannerSingle', 'dropRateBannerMulti',
      'dropRatePremiumSingle', 'dropRatePremiumMulti',
      'dropRatePity',
      'capSingle', 'capMulti', 'multiplierScaling', 'minimumRate',
      'color', 'accentColor',
      'glowIntensity', 'buildupTime', 'confettiCount',
      'orbCount', 'ringCount',
      'isPityEligible'
    ];
    
    // Allow name change only for non-default rarities
    if (!rarity.isDefault && req.body.name) {
      // Check for duplicate
      const existing = await Rarity.findOne({ 
        where: { name: req.body.name.toLowerCase() }
      });
      if (existing && existing.id !== rarity.id) {
        return res.status(400).json({ error: 'A rarity with this name already exists' });
      }
      rarity.name = req.body.name.toLowerCase();
    }
    
    // Update allowed fields
    updateableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        rarity[field] = req.body[field];
      }
    });
    
    await rarity.save();
    
    // Invalidate cache so updates are picked up immediately
    invalidateRaritiesCache();
    
    console.log(`Admin (ID: ${req.user.id}) updated rarity: ${rarity.name}`);
    res.json(rarity);
  } catch (err) {
    console.error('Error updating rarity:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

/**
 * DELETE /api/rarities/:id
 * Delete a rarity (admin only, non-default only)
 */
router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid rarity ID' });
    }
    
    const rarity = await Rarity.findByPk(req.params.id);
    if (!rarity) {
      return res.status(404).json({ error: 'Rarity not found' });
    }
    
    // Prevent deleting default rarities
    if (rarity.isDefault) {
      return res.status(400).json({ 
        error: 'Cannot delete default rarities. You can only modify their settings.' 
      });
    }
    
    // Check if any characters use this rarity
    const { Character } = require('../models');
    const characterCount = await Character.count({ where: { rarity: rarity.name } });
    if (characterCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete rarity "${rarity.displayName}" because ${characterCount} characters are using it. Please reassign them first.` 
      });
    }
    
    const deletedName = rarity.name;
    await rarity.destroy();
    
    // Invalidate cache so deletion is picked up immediately
    invalidateRaritiesCache();
    
    console.log(`Admin (ID: ${req.user.id}) deleted rarity: ${deletedName}`);
    res.json({ message: `Rarity "${deletedName}" deleted successfully` });
  } catch (err) {
    console.error('Error deleting rarity:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

/**
 * POST /api/rarities/reset-defaults
 * Reset all default rarities to their original values (admin only)
 */
router.post('/reset-defaults', [auth, adminAuth], async (req, res) => {
  try {
    const defaults = Rarity.DEFAULT_RARITIES;
    
    for (const defaultRarity of defaults) {
      const existing = await Rarity.findOne({ where: { name: defaultRarity.name } });
      if (existing) {
        // Update to default values
        Object.assign(existing, defaultRarity);
        await existing.save();
      } else {
        // Create if missing
        await Rarity.create(defaultRarity);
      }
    }
    
    // Invalidate cache so reset values are picked up immediately
    invalidateRaritiesCache();
    
    console.log(`Admin (ID: ${req.user.id}) reset default rarities`);
    
    const rarities = await Rarity.findAll({ order: [['order', 'ASC']] });
    res.json({ 
      message: 'Default rarities have been reset',
      rarities 
    });
  } catch (err) {
    console.error('Error resetting rarities:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;

