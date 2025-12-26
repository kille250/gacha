/**
 * Admin Standard Banner Routes
 *
 * Handles management of the Standard Banner (default character pool).
 * Routes: GET/POST /standard-banner/*
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const adminAuth = require('../../middleware/adminAuth');
const {
  getStandardBanner,
  getStandardBannerCharacters,
  removeCharacterFromStandardBanner,
  bulkAddToStandardBanner,
  getUnassignedCharacters,
  invalidateStandardBannerCache
} = require('../../services/standardBannerService');
const { logAdminAction, AUDIT_EVENTS } = require('../../services/auditService');
const { isValidId } = require('../../utils/validation');

// GET /api/admin/standard-banner - Get Standard Banner info and characters
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const banner = await getStandardBanner();
    if (!banner) {
      return res.status(404).json({
        error: 'Standard Banner not found. Run migrations to create it.'
      });
    }

    const characters = await getStandardBannerCharacters(true); // Force refresh

    res.json({
      banner: {
        id: banner.id,
        name: banner.name,
        description: banner.description,
        isStandard: banner.isStandard,
        active: banner.active
      },
      characters: characters.map(c => ({
        id: c.id,
        name: c.name,
        series: c.series,
        rarity: c.rarity,
        image: c.image,
        isR18: c.isR18
      })),
      totalCharacters: characters.length
    });
  } catch (err) {
    console.error('Get standard banner error:', err);
    res.status(500).json({ error: 'Failed to fetch standard banner' });
  }
});

// GET /api/admin/standard-banner/unassigned - Get characters not on any banner
router.get('/unassigned', auth, adminAuth, async (req, res) => {
  try {
    const unassigned = await getUnassignedCharacters();

    res.json({
      characters: unassigned.map(c => ({
        id: c.id,
        name: c.name,
        series: c.series,
        rarity: c.rarity,
        image: c.image,
        isR18: c.isR18
      })),
      total: unassigned.length,
      message: unassigned.length > 0
        ? `${unassigned.length} character(s) are not assigned to any banner and will NOT be pullable`
        : 'All characters are assigned to at least one banner'
    });
  } catch (err) {
    console.error('Get unassigned characters error:', err);
    res.status(500).json({ error: 'Failed to fetch unassigned characters' });
  }
});

// POST /api/admin/standard-banner/add - Add character(s) to Standard Banner
router.post('/add', [auth, adminAuth], async (req, res) => {
  try {
    const { characterId, characterIds } = req.body;

    // Support both single and bulk add
    const idsToAdd = characterIds || (characterId ? [characterId] : []);

    if (!idsToAdd.length) {
      return res.status(400).json({ error: 'characterId or characterIds required' });
    }

    // Validate IDs
    for (const id of idsToAdd) {
      if (!isValidId(id)) {
        return res.status(400).json({ error: `Invalid character ID: ${id}` });
      }
    }

    const addedCount = await bulkAddToStandardBanner(idsToAdd);

    await logAdminAction(AUDIT_EVENTS.ADMIN_BANNER_UPDATE || 'admin.standard_banner.add', req.user.id, null, {
      action: 'add_to_standard_banner',
      characterIds: idsToAdd,
      addedCount
    }, req);

    console.log(`Admin (ID: ${req.user.id}) added ${addedCount} character(s) to Standard Banner`);

    res.json({
      success: true,
      message: `Added ${addedCount} character(s) to Standard Banner`,
      addedCount
    });
  } catch (err) {
    console.error('Add to standard banner error:', err);
    res.status(500).json({ error: err.message || 'Failed to add character(s)' });
  }
});

// POST /api/admin/standard-banner/remove - Remove character from Standard Banner
router.post('/remove', [auth, adminAuth], async (req, res) => {
  try {
    const { characterId } = req.body;

    if (!characterId || !isValidId(characterId)) {
      return res.status(400).json({ error: 'Valid characterId required' });
    }

    await removeCharacterFromStandardBanner(characterId);

    await logAdminAction(AUDIT_EVENTS.ADMIN_BANNER_UPDATE || 'admin.standard_banner.remove', req.user.id, null, {
      action: 'remove_from_standard_banner',
      characterId
    }, req);

    console.log(`Admin (ID: ${req.user.id}) removed character ${characterId} from Standard Banner`);

    res.json({
      success: true,
      message: 'Character removed from Standard Banner',
      characterId
    });
  } catch (err) {
    console.error('Remove from standard banner error:', err);
    res.status(500).json({ error: err.message || 'Failed to remove character' });
  }
});

// POST /api/admin/standard-banner/add-all-unassigned - Add all unassigned characters to Standard Banner
router.post('/add-all-unassigned', [auth, adminAuth], async (req, res) => {
  try {
    const unassigned = await getUnassignedCharacters();

    if (unassigned.length === 0) {
      return res.json({
        success: true,
        message: 'No unassigned characters to add',
        addedCount: 0
      });
    }

    const characterIds = unassigned.map(c => c.id);
    const addedCount = await bulkAddToStandardBanner(characterIds);

    await logAdminAction(AUDIT_EVENTS.ADMIN_BANNER_UPDATE || 'admin.standard_banner.bulk_add', req.user.id, null, {
      action: 'add_all_unassigned_to_standard_banner',
      characterIds,
      addedCount
    }, req);

    console.log(`Admin (ID: ${req.user.id}) added ${addedCount} unassigned character(s) to Standard Banner`);

    res.json({
      success: true,
      message: `Added ${addedCount} unassigned character(s) to Standard Banner`,
      addedCount,
      characterIds
    });
  } catch (err) {
    console.error('Add all unassigned error:', err);
    res.status(500).json({ error: err.message || 'Failed to add unassigned characters' });
  }
});

// POST /api/admin/standard-banner/refresh-cache - Force refresh Standard Banner cache
router.post('/refresh-cache', [auth, adminAuth], async (req, res) => {
  try {
    invalidateStandardBannerCache();
    const characters = await getStandardBannerCharacters(true);

    res.json({
      success: true,
      message: 'Standard Banner cache refreshed',
      characterCount: characters.length
    });
  } catch (err) {
    console.error('Refresh cache error:', err);
    res.status(500).json({ error: 'Failed to refresh cache' });
  }
});

module.exports = router;
