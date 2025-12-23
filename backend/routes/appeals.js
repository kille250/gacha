/**
 * Appeals Routes
 * 
 * Handles user appeals for account restrictions.
 * Includes submission and admin review endpoints.
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { User } = require('../models');
const Appeal = require('../models/appeal');
const { logAdminAction, AUDIT_EVENTS } = require('../services/auditService');

// ===========================================
// USER ENDPOINTS
// ===========================================

// GET /api/appeals/status - Check user's appeal status
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['restrictionType', 'restrictedUntil', 'restrictionReason']
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has a restriction
    if (!user.restrictionType || user.restrictionType === 'none') {
      return res.json({
        hasRestriction: false,
        canAppeal: false
      });
    }
    
    // Check for existing appeal
    const existingAppeal = await Appeal.findOne({
      where: {
        userId: req.user.id,
        restrictionType: user.restrictionType
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      hasRestriction: true,
      restriction: {
        type: user.restrictionType,
        until: user.restrictedUntil,
        reason: user.restrictionReason
      },
      canAppeal: !existingAppeal || existingAppeal.status === 'denied',
      existingAppeal: existingAppeal ? {
        id: existingAppeal.id,
        status: existingAppeal.status,
        createdAt: existingAppeal.createdAt,
        reviewNotes: existingAppeal.status === 'denied' ? existingAppeal.reviewNotes : null
      } : null
    });
  } catch (err) {
    console.error('Appeal status error:', err);
    res.status(500).json({ error: 'Failed to check appeal status' });
  }
});

// POST /api/appeals/submit - Submit an appeal
router.post('/submit', auth, async (req, res) => {
  try {
    const { appealText } = req.body;
    
    if (!appealText || appealText.length < 10) {
      return res.status(400).json({ 
        error: 'Appeal text must be at least 10 characters' 
      });
    }
    
    if (appealText.length > 2000) {
      return res.status(400).json({ 
        error: 'Appeal text cannot exceed 2000 characters' 
      });
    }
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has a restriction worth appealing
    if (!user.restrictionType || user.restrictionType === 'none') {
      return res.status(400).json({ error: 'No active restriction to appeal' });
    }
    
    // Check for existing pending appeal for this restriction
    const existingAppeal = await Appeal.findPendingForUser(
      req.user.id, 
      user.restrictionType
    );
    
    if (existingAppeal) {
      return res.status(400).json({ 
        error: 'You already have a pending appeal for this restriction',
        appealId: existingAppeal.id
      });
    }
    
    // Check if user was denied recently (24 hour cooldown)
    const recentDenial = await Appeal.findOne({
      where: {
        userId: req.user.id,
        restrictionType: user.restrictionType,
        status: 'denied'
      },
      order: [['reviewedAt', 'DESC']]
    });
    
    if (recentDenial) {
      const hoursSinceDenial = (Date.now() - new Date(recentDenial.reviewedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceDenial < 24) {
        return res.status(400).json({
          error: 'Please wait 24 hours after a denied appeal before submitting again',
          retryAfter: Math.ceil(24 - hoursSinceDenial) * 60 * 60 // seconds
        });
      }
    }
    
    // Create the appeal
    const appeal = await Appeal.create({
      userId: req.user.id,
      restrictionType: user.restrictionType,
      appealText: appealText.trim()
    });
    
    res.status(201).json({
      success: true,
      message: 'Appeal submitted successfully',
      appeal: {
        id: appeal.id,
        status: appeal.status,
        createdAt: appeal.createdAt
      }
    });
  } catch (err) {
    console.error('Appeal submit error:', err);
    res.status(500).json({ error: 'Failed to submit appeal' });
  }
});

// GET /api/appeals/history - Get user's appeal history
router.get('/history', auth, async (req, res) => {
  try {
    const appeals = await Appeal.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 10,
      attributes: ['id', 'restrictionType', 'status', 'createdAt', 'reviewedAt', 'reviewNotes']
    });
    
    res.json({
      appeals: appeals.map(a => ({
        id: a.id,
        restrictionType: a.restrictionType,
        status: a.status,
        createdAt: a.createdAt,
        reviewedAt: a.reviewedAt,
        reviewNotes: a.status === 'denied' ? a.reviewNotes : null
      }))
    });
  } catch (err) {
    console.error('Appeal history error:', err);
    res.status(500).json({ error: 'Failed to fetch appeal history' });
  }
});

// ===========================================
// ADMIN ENDPOINTS
// ===========================================

// GET /api/appeals/admin/pending - Get pending appeals
router.get('/admin/pending', auth, adminAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const appeals = await Appeal.getPendingAppeals({
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
    
    const total = await Appeal.count({ where: { status: 'pending' } });
    
    res.json({
      appeals,
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  } catch (err) {
    console.error('Get pending appeals error:', err);
    res.status(500).json({ error: 'Failed to fetch pending appeals' });
  }
});

// GET /api/appeals/admin/:id - Get specific appeal details
router.get('/admin/:id', auth, adminAuth, async (req, res) => {
  try {
    const appealId = parseInt(req.params.id, 10);
    
    const appeal = await Appeal.findByPk(appealId, {
      include: [{
        model: User,
        as: 'user',
        attributes: [
          'id', 'username', 'email', 'createdAt',
          'restrictionType', 'restrictedUntil', 'restrictionReason',
          'riskScore', 'warningCount', 'deviceFingerprints'
        ]
      }]
    });
    
    if (!appeal) {
      return res.status(404).json({ error: 'Appeal not found' });
    }
    
    res.json(appeal);
  } catch (err) {
    console.error('Get appeal error:', err);
    res.status(500).json({ error: 'Failed to fetch appeal' });
  }
});

// POST /api/appeals/admin/:id/approve - Approve an appeal
router.post('/admin/:id/approve', auth, adminAuth, async (req, res) => {
  try {
    const appealId = parseInt(req.params.id, 10);
    const { notes } = req.body;
    
    const appeal = await Appeal.approve(appealId, req.user.id, notes || 'Approved');
    
    // Log the action
    await logAdminAction(AUDIT_EVENTS.ADMIN_UNRESTRICT, req.user.id, appeal.userId, {
      source: 'appeal',
      appealId,
      notes
    }, req);
    
    res.json({
      success: true,
      message: 'Appeal approved and restriction removed',
      appeal
    });
  } catch (err) {
    console.error('Approve appeal error:', err);
    res.status(500).json({ error: err.message || 'Failed to approve appeal' });
  }
});

// POST /api/appeals/admin/:id/deny - Deny an appeal
router.post('/admin/:id/deny', auth, adminAuth, async (req, res) => {
  try {
    const appealId = parseInt(req.params.id, 10);
    const { notes } = req.body;
    
    if (!notes || notes.length < 10) {
      return res.status(400).json({ 
        error: 'Denial reason is required (min 10 characters)' 
      });
    }
    
    const appeal = await Appeal.deny(appealId, req.user.id, notes);
    
    // Log the action
    await logAdminAction(AUDIT_EVENTS.ADMIN_RESTRICT, req.user.id, appeal.userId, {
      source: 'appeal_denial',
      appealId,
      notes
    }, req);
    
    res.json({
      success: true,
      message: 'Appeal denied',
      appeal
    });
  } catch (err) {
    console.error('Deny appeal error:', err);
    res.status(500).json({ error: err.message || 'Failed to deny appeal' });
  }
});

// GET /api/appeals/admin/stats - Get appeal statistics
router.get('/admin/stats', auth, adminAuth, async (req, res) => {
  try {
    const [pending, approved, denied, total] = await Promise.all([
      Appeal.count({ where: { status: 'pending' } }),
      Appeal.count({ where: { status: 'approved' } }),
      Appeal.count({ where: { status: 'denied' } }),
      Appeal.count()
    ]);
    
    res.json({
      pending,
      approved,
      denied,
      total,
      approvalRate: total > 0 ? ((approved / (approved + denied)) * 100).toFixed(1) : 0
    });
  } catch (err) {
    console.error('Appeal stats error:', err);
    res.status(500).json({ error: 'Failed to fetch appeal stats' });
  }
});

module.exports = router;

